/* O WEBHOOK DO ASAAS, SEM O NEXT E SEM O SUPABASE.

   A rota (app/api/webhooks/asaas/route.js) só autentica, lê o corpo e chama
   `processarEvento`. Tudo o que decide QUEM ganha acesso, e até quando, mora
   aqui — e recebe o banco e a API do Asaas por parâmetro, pra que os testes
   rodem o fluxo inteiro (checkout → cobrança → renovação → estorno) com um
   banco de mentira. Lições trazidas do webhook do AbacatePay
   (lib/webhookAbacate.js), que aprendeu cada uma delas em produção:

   1. NOME DE EVENTO SE COMPARA EXATO. Lá, um regex de "parece pago" liberava
      acesso pra reembolso e pra saque do próprio dono da loja. Aqui só os
      nomes da lista oficial fazem alguma coisa; o resto é registrado e só.
   2. O PAYLOAD É A FONTE MENOS CONFIÁVEL de quem pagou. Primeiro o nosso
      banco (o pedido que a gente gravou antes de mandar a pessoa pagar), depois
      a API do Asaas, e nunca "qualquer e-mail que aparecer no JSON".
   3. A VALIDADE NUNCA ENCURTA e nunca some no degrau de degradação.

   E uma que é só do Asaas: a fila de webhooks é PAUSADA depois de 15 falhas
   seguidas. Responder erro pra um evento que nunca vai dar certo (pagamento
   que não é nosso, pedido que não existe) trava a confirmação de TODO MUNDO
   que pagar depois. Então só falha de banco devolve 500 — é transitória e
   vale a retentativa. O resto responde 200 e fica registrado. */

import { getPlan, PLANS, ehAssinatura, planoVendavel } from './plans';
import { validadeEmDias } from './payments';
import { baseDaRenovacao } from './acessoPago';
import { somarMeses, dataSP } from './asaasPedido';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------ os eventos ------------------------------ */

/* Cobrança paga. Cartão manda CONFIRMED na aprovação e RECEIVED ~32 dias
   depois, quando o dinheiro cai — a MESMA cobrança, dois eventos. Pix manda só
   RECEIVED. Os dois liberam, e é a trava por id da cobrança (`jaLiberou`) que
   impede o cartão de dar dois meses por uma mensalidade. */
export const EVENTOS_PAGOS = Object.freeze(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']);

/* Dinheiro devolvido. REFUND_IN_PROGRESS fica de fora de propósito: é estorno
   AGENDADO, e o REFUNDED chega quando ele acontece. Estorno parcial também:
   devolver parte de uma mensalidade não é cancelar o acesso. */
export const EVENTOS_DE_ESTORNO = Object.freeze(['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED']);

/* A recorrência acabou. NÃO revoga: o que já foi pago vale até o fim. */
export const EVENTOS_DE_FIM = Object.freeze([
  'SUBSCRIPTION_DELETED',
  'SUBSCRIPTION_INACTIVATED',
  'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED',
  'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED',
]);

/* Eventos que não mexem em acesso, mas amarram ids do Asaas ao nosso pedido —
   é o que deixa a cobrança do mês 2 encontrar o dono sem depender do payload. */
export const EVENTOS_DE_VINCULO = Object.freeze([
  'CHECKOUT_PAID',
  'SUBSCRIPTION_CREATED',
  'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED',
]);

/* Só registrados, pro diagnóstico mostrar por que uma renovação não veio. */
export const EVENTOS_SO_REGISTRO = Object.freeze([
  'PAYMENT_OVERDUE',
  'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED',
  'PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_REFUSED',
]);

/* O que o webhook assina no Asaas (scripts/asaas-setup.mjs lê daqui). Uma lista
   só, pra que assinar um evento e tratá-lo não sejam duas coisas que divergem. */
export const EVENTOS_ASSINADOS = Object.freeze([
  ...EVENTOS_PAGOS, ...EVENTOS_DE_ESTORNO, ...EVENTOS_DE_FIM, ...EVENTOS_DE_VINCULO, ...EVENTOS_SO_REGISTRO,
]);

export function classificar(evento) {
  const e = String(evento || '').trim();
  if (EVENTOS_PAGOS.includes(e)) return 'liberar';
  if (EVENTOS_DE_ESTORNO.includes(e)) return 'revogar';
  if (EVENTOS_DE_FIM.includes(e)) return 'encerrar';
  if (EVENTOS_DE_VINCULO.includes(e)) return 'vincular';
  return 'registrar';
}

/* --------------------------- quanto tempo vale -------------------------- */

/* Dias de folga depois do vencimento seguinte. Cobre o cartão recusado na
   primeira tentativa, o banco que agenda o Pix Automático pra fim do dia e as
   3 retentativas em 7 dias — sem que a pessoa perca a aula enquanto isso. */
export const FOLGA_DIAS = 3;

const somarDias = (data, dias) => {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

/* ATÉ QUANDO UMA MENSALIDADE PAGA VALE.

   Ancorada no VENCIMENTO, e não "30 dias a partir de agora" nem somada ao que
   sobrou. Somar (como o avulso faz) acumularia a folga todo mês: com 3 dias de
   folga, em um ano a pessoa teria ganhado mais de um mês de graça. Contar de
   agora faria quem paga atrasado empurrar o vencimento pra frente.

   Vence às 23h59 de São Paulo do dia (vencimento seguinte + folga) — 02:59Z do
   dia depois. E nunca encurta: quem ainda tem um trimestral em vigor não perde
   dias por ter assinado o mensal. */
export function validadeDaAssinatura({ vencimento, vigente, agora = new Date() }) {
  const base = /^\d{4}-\d{2}-\d{2}/.test(String(vencimento || '')) ? String(vencimento).slice(0, 10) : dataSP(agora);
  const ultimoDia = somarDias(somarMeses(base, 1), FOLGA_DIAS);
  const fim = new Date(`${somarDias(ultimoDia, 1)}T02:59:59.000Z`);
  if (vigente && new Date(vigente) > fim) return new Date(vigente).toISOString();
  return fim.toISOString();
}

/* A validade de qualquer compra: assinatura ancora no vencimento, avulso soma
   os dias do plano ao que sobrou (regra que já valia no AbacatePay). */
export function validadeDaCompra({ plano, vencimento, vigente, agora = new Date() }) {
  if (ehAssinatura(plano)) return validadeDaAssinatura({ vencimento, vigente, agora });
  return validadeEmDias(plano.dias, baseDaRenovacao(vigente, agora));
}

/* Qual plano é esta cobrança, quando o pedido não diz. Só por valor EXATO e só
   entre os planos à venda — o semanal aposentado custa R$ 19,90, e uma cobrança
   avulsa de R$ 19,90 que alguém faça pelo painel não pode virar acesso. */
export function planoPeloValor(valor) {
  const centavos = Math.round(Number(valor) * 100);
  if (!Number.isFinite(centavos)) return null;
  const id = Object.keys(PLANS).find((k) => planoVendavel(k) && PLANS[k].price === centavos);
  return id || null;
}

export const normalizarEmail = (e) => (typeof e === 'string' && EMAIL_RE.test(e.trim()) ? e.trim().toLowerCase() : null);

const limpo = (s) => (typeof s === 'string' && s.trim() ? s.trim() : null);

/* ------------------------------ de quem é ------------------------------- */

/* Procura o pedido desta cobrança, do vínculo mais forte pro mais fraco.

   Cada degrau tem um caso que só ele resolve:
   1. `checkoutSession` — a 1ª cobrança de qualquer checkout (avulso ou cartão).
   2. `subscription` no nosso banco — as renovações, depois que um evento de
      vínculo gravou o id da assinatura no pedido.
   3. `subscription` na API — a renovação quando o vínculo NÃO foi gravado
      (migration 0042 não rodou, ou o evento de vínculo se perdeu): a
      assinatura criada por checkout guarda o `checkoutSession` de origem.
   4. `externalReference` — cobrança que a gente mesmo criou com o id do pedido.
   5. `customer` no nosso banco — o Pix Automático, cujo cliente a gente cria
      antes do QR Code e grava no pedido. */
export async function pedidoDaCobranca(pagamento, { repo, asaas }) {
  const checkout = limpo(pagamento?.checkoutSession);
  const assinatura = limpo(pagamento?.subscription);
  const ref = limpo(pagamento?.externalReference);
  const cliente = limpo(pagamento?.customer);

  if (checkout) {
    const p = await repo.pedidoPor('bill_id', checkout);
    if (p) return { pedido: p, via: 'checkout' };
  }
  if (assinatura) {
    const p = await repo.pedidoPor('provider_subscription_id', assinatura);
    if (p) return { pedido: p, via: 'assinatura' };
    try {
      const sub = await asaas.buscarAssinatura(assinatura);
      const origem = limpo(sub?.checkoutSession);
      if (origem) {
        const p2 = await repo.pedidoPor('bill_id', origem);
        if (p2) return { pedido: p2, via: 'assinatura→checkout' };
      }
    } catch { /* a API pode estar fora; seguem os outros degraus */ }
  }
  if (ref && UUID_RE.test(ref)) {
    const p = await repo.pedidoPor('id', ref);
    if (p) return { pedido: p, via: 'externalReference' };
  }
  if (cliente) {
    const p = await repo.pedidoPor('provider_customer_id', cliente);
    if (p) return { pedido: p, via: 'cliente' };
  }
  return { pedido: null, via: null };
}

/* Sem pedido, a última pergunta: este cliente do Asaas é um cliente NOSSO?

   Só é quando a gente o criou — e quando cria, grava o id do usuário em
   `externalReference`. Um cliente cadastrado à mão no painel (outro negócio do
   dono, uma cobrança avulsa) não tem isso, e o e-mail dele não ganha acesso.
   Era exatamente o furo do "qualquer e-mail do payload" no AbacatePay. */
export async function donoPeloCliente(pagamento, { repo, asaas }) {
  const id = limpo(pagamento?.customer);
  if (!id) return null;
  try {
    const c = await asaas.buscarCliente(id);
    const userId = limpo(c?.externalReference);
    if (!userId || !UUID_RE.test(userId)) return null;
    const email = normalizarEmail(await repo.emailDoUsuario(userId));
    return email ? { email, userId } : null;
  } catch {
    return null;
  }
}

/* QUAL COMPRA esta cobrança é — a chave da trava contra liberar duas vezes.

   Uma cobrança só é uma compra só, EXCETO no parcelado: o trimestral em 8x no
   cartão vira 8 cobranças no Asaas, todas com o mesmo `installment`, e cada
   uma manda o seu PAYMENT_CONFIRMED. Com a trava por cobrança, 8 parcelas
   dariam 8 × 90 dias. A chave do parcelado é o parcelamento inteiro. */
export function refDaCompra(pagamento) {
  const parcelamento = limpo(pagamento?.installment);
  if (parcelamento) return { chave: `parc:${parcelamento}`, campo: 'installment', valor: parcelamento };
  const id = limpo(pagamento?.id);
  return { chave: id, campo: 'id', valor: id };
}

/* ------------------------------ o processador --------------------------- */

const R = (status, outcome, extra = {}) => ({ status, outcome, ...extra });

/**
 * Processa UM evento do Asaas. Devolve { status, outcome, email? } — a rota
 * responde com `status` e registra `outcome` em webhook_events.
 *
 * repo:  pedidoPor(coluna, valor) · vincular(coluna, valor, campos) ·
 *        emailDoUsuario(id) · jaLiberou(refDaCompra) · validadeAtual(email) ·
 *        gravarAcesso(linha) → { error } · revogar(email)
 * asaas: buscarCliente(id) · buscarAssinatura(id)
 */
export async function processarEvento(body, { repo, asaas, agora = new Date() }) {
  const evento = String(body?.event || '').trim();
  const tipo = classificar(evento);

  if (tipo === 'registrar') return R(200, 'registrado');

  if (tipo === 'vincular') {
    if (evento === 'CHECKOUT_PAID') {
      const c = body?.checkout || {};
      if (limpo(c.id) && limpo(c.customer)) await repo.vincular('bill_id', c.id, { provider_customer_id: c.customer });
      return R(200, 'vinculado (checkout)');
    }
    if (evento === 'SUBSCRIPTION_CREATED') {
      const s = body?.subscription || {};
      if (limpo(s.checkoutSession) && limpo(s.id)) {
        await repo.vincular('bill_id', s.checkoutSession, { provider_subscription_id: s.id, provider_customer_id: s.customer || null });
      }
      return R(200, 'vinculado (assinatura)');
    }
    // PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED: o pedido do Pix
    // Automático guarda o id da AUTORIZAÇÃO em bill_id.
    const a = body?.authorization || {};
    if (limpo(a.id)) {
      await repo.vincular('bill_id', a.id, {
        ...(limpo(a.subscriptionId) ? { provider_subscription_id: a.subscriptionId } : {}),
        ...(limpo(a.customerId) ? { provider_customer_id: a.customerId } : {}),
        status: 'paid',
      });
    }
    return R(200, 'vinculado (pix automático ativo)');
  }

  if (tipo === 'encerrar') {
    // Assinatura removida/inativada, ou autorização do Pix cancelada/expirada.
    // O acesso já pago continua até expires_at — aqui só marcamos o pedido.
    const s = body?.subscription;
    const a = body?.authorization;
    if (limpo(s?.id)) await repo.vincular('provider_subscription_id', s.id, { status: 'canceled' });
    if (limpo(a?.id)) await repo.vincular('bill_id', a.id, { status: 'canceled' });
    return R(200, 'encerrado (acesso vale até o fim do período pago)');
  }

  const pagamento = body?.payment || {};
  const pagamentoId = limpo(pagamento.id);
  if (!pagamentoId) return R(200, 'sem_id_de_cobranca');

  const { pedido, via } = await pedidoDaCobranca(pagamento, { repo, asaas });
  let email = normalizarEmail(pedido?.email);
  let origem = via;
  if (!email) {
    const dono = await donoPeloCliente(pagamento, { repo, asaas });
    if (dono) { email = dono.email; origem = 'cliente do Asaas'; }
  }

  if (!email) {
    // Não é cobrança do Cadence (ou o pedido sumiu). 200 de propósito: ver o
    // comentário do topo sobre a fila pausada.
    return R(200, 'pagamento_de_fora');
  }

  if (tipo === 'revogar') {
    await repo.revogar(email);
    if (pedido?.id) await repo.vincular('id', pedido.id, { status: evento === 'PAYMENT_REFUNDED' ? 'refunded' : 'disputed' });
    return R(200, `revogado (via ${origem})`, { email });
  }

  // tipo === 'liberar'
  const ref = refDaCompra(pagamento);
  if (await repo.jaLiberou(ref)) return R(200, 'ja_liberado', { email });

  /* O plano vem do PEDIDO. Sem pedido (cliente nosso, vínculo perdido): se a
     cobrança é de uma assinatura, é o mensal; se não, só pelo valor exato. */
  const planoId = pedido?.plan || (limpo(pagamento.subscription) ? 'pro-mensal' : planoPeloValor(pagamento.value));
  const plano = getPlan(planoId);
  if (!plano) return R(200, 'sem_plano', { email });

  const vigente = await repo.validadeAtual(email);
  const expiresAt = validadeDaCompra({ plano, vencimento: pagamento.dueDate, vigente, agora });

  const linha = {
    email,
    provider: 'asaas',
    paid_at: agora.toISOString(),
    expires_at: expiresAt,
    payment_ref: ref.chave,
  };
  if (typeof pagamento.value === 'number') linha.amount = pagamento.value;
  if (limpo(pagamento.billingType)) linha.method = pagamento.billingType;

  const { error } = await repo.gravarAcesso(linha);
  if (error) {
    // Banco fora: é a ÚNICA falha que pede retentativa ao Asaas.
    return R(500, `falha_ao_gravar: ${error.message || error}`, { email });
  }

  if (pedido?.id) {
    await repo.vincular('id', pedido.id, {
      status: 'paid',
      ...(limpo(pagamento.subscription) ? { provider_subscription_id: pagamento.subscription } : {}),
      ...(limpo(pagamento.customer) ? { provider_customer_id: pagamento.customer } : {}),
    });
  }

  return R(200, `liberado (via ${origem}) ate ${expiresAt.slice(0, 10)}`, { email, plano: planoId });
}

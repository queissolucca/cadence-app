/* A ASSINATURA DE UMA PESSOA, LIDA DIRETO DO ASAAS. SERVER-ONLY.

   Usada pela linha "Assinatura" do Perfil: mostrar o que está ativo e
   cancelar. A fonte é o Asaas, e não a nossa tabela `orders`, porque é lá que
   a cobrança acontece — um pedido nosso marcado "pago" com a assinatura já
   removida no painel mostraria uma assinatura que não existe, e o contrário
   deixaria alguém sem conseguir cancelar algo que continua cobrando.

   O CUIDADO QUE MANDA EM TUDO AQUI: a conta do Asaas pode ter clientes de
   OUTROS negócios do dono, inclusive com o mesmo e-mail. Cancelar "tudo o que
   o cliente com este e-mail tem" poderia derrubar uma assinatura que não é do
   Cadence. Então só entra o que é comprovadamente nosso:
   - Pix Automático de um cliente que NÓS criamos (externalReference = id do
     usuário — só /api/checkout/pix-automatico cria assim);
   - assinatura de cartão nascida de um checkout NOSSO (o `checkoutSession` dela
     é o `bill_id` de um pedido desta pessoa) ou já vinculada a um pedido. */

import {
  listarClientes, listarAssinaturas, listarAutorizacoesPix,
  cancelarAutorizacaoPix, removerAssinatura,
} from './asaas';

async function tenta(fn, padrao) {
  try { return await fn(); } catch { return padrao; }
}

async function pedidosDe(admin, userId) {
  let r = await admin.from('orders').select('bill_id,provider_customer_id,provider_subscription_id')
    .eq('user_id', userId).eq('provider', 'asaas').limit(100);
  // Sem a migration 0042 só existe bill_id.
  if (r.error) r = await admin.from('orders').select('bill_id').eq('user_id', userId).eq('provider', 'asaas').limit(100);
  return r.error ? [] : r.data || [];
}

/* Separa o que é do Cadence do que não é. Pura — tem teste. */
export function soAsDoCadence({ assinaturas, autorizacoes, pedidos }) {
  const bills = new Set(pedidos.map((p) => p.bill_id).filter(Boolean));
  const subsDosPedidos = new Set(pedidos.map((p) => p.provider_subscription_id).filter(Boolean));

  const pix = autorizacoes.map((a) => ({
    tipo: 'pix_automatico',
    autorizacaoId: a.id,
    assinaturaId: a.subscriptionId || null,
    valor: a.value ?? null,
    proximaCobranca: null,
  }));
  const subsDoPix = new Set(pix.map((p) => p.assinaturaId).filter(Boolean));

  const cartao = [];
  for (const s of assinaturas) {
    if (subsDoPix.has(s.id)) {
      // A assinatura que o Pix Automático (modo SUBSCRIPTION) usa por baixo:
      // não é uma segunda recorrência, é a mesma. Só empresta a data.
      const p = pix.find((x) => x.assinaturaId === s.id);
      p.proximaCobranca = s.nextDueDate || null;
      continue;
    }
    const nossa = bills.has(s.checkoutSession) || subsDosPedidos.has(s.id);
    if (!nossa) continue;
    cartao.push({
      tipo: s.billingType === 'CREDIT_CARD' ? 'cartao' : 'outro',
      autorizacaoId: null,
      assinaturaId: s.id,
      valor: s.value ?? null,
      proximaCobranca: s.nextDueDate || null,
    });
  }
  return [...pix, ...cartao];
}

/* Tudo o que está cobrando esta pessoa todo mês, no Cadence. */
export async function recorrenciasAtivas(admin, user) {
  const pedidos = await tenta(() => pedidosDe(admin, user.id), []);

  const [nossos, porEmail] = await Promise.all([
    tenta(() => listarClientes({ externalReference: user.id }), []),
    tenta(() => listarClientes({ email: user.email }), []),
  ]);
  const clientes = new Set([...nossos, ...porEmail].filter((c) => c?.id && !c.deleted).map((c) => c.id));
  for (const p of pedidos) if (p.provider_customer_id) clientes.add(p.provider_customer_id);
  const criadosPorNos = new Set(nossos.map((c) => c.id));

  const assinaturas = [];
  const autorizacoes = [];
  await Promise.all([...clientes].map(async (id) => {
    assinaturas.push(...await tenta(() => listarAssinaturas({ customer: id, status: 'ACTIVE' }), []));
    // Pix Automático: só de cliente que a gente criou (ver o topo).
    if (criadosPorNos.has(id)) {
      autorizacoes.push(...await tenta(() => listarAutorizacoesPix({ customerId: id, status: 'ACTIVE' }), []));
    }
  }));

  return soAsDoCadence({ assinaturas, autorizacoes, pedidos });
}

/* Cancela as recorrências. O acesso já pago continua até expires_at — quem
   cancela não perde os dias que pagou. */
export async function cancelarRecorrencias(itens) {
  let canceladas = 0;
  const falhas = [];
  for (const it of itens) {
    let ok = true;
    // A autorização primeiro: é ela que deixa o banco debitar.
    if (it.autorizacaoId) {
      try { await cancelarAutorizacaoPix(it.autorizacaoId); } catch (e) { if (e?.status !== 404) { ok = false; falhas.push(String(e?.message || e)); } }
    }
    if (it.assinaturaId) {
      try { await removerAssinatura(it.assinaturaId); } catch (e) { if (e?.status !== 404) { ok = false; falhas.push(String(e?.message || e)); } }
    }
    if (ok) canceladas += 1;
  }
  return { canceladas, falhas };
}

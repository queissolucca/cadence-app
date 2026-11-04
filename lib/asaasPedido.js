/* O QUE A GENTE MANDA PRO ASAAS, MONTADO FORA DAS ROTAS.

   Mesmo motivo do `corpoCheckout` do AbacatePay em lib/payments.js: o formato
   destes objetos já derrubou o botão de pagar em produção mais de uma vez
   (método que a loja não tem, campo que só vale com outro campo). Aqui eles
   são funções puras, e tem teste em tests/asaasPedido.test.js. */

import { maxInstallmentsFor } from './payments';
import { IMAGEM_DO_ITEM } from './asaasItemImagem';

/* ------------------------------- datas -------------------------------- */

const FUSO = 'America/Sao_Paulo';

/* As partes da data/hora no fuso de São Paulo. O vencimento é uma DATA
   brasileira: à 0h30 em SP já é amanhã em UTC, e mandar o dia de amanhã como
   primeiro vencimento adiaria a primeira cobrança em um dia. */
function partesSP(agora) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const p = Object.fromEntries(f.formatToParts(agora).map((x) => [x.type, x.value]));
  return p;
}

/** 'AAAA-MM-DD' no fuso de São Paulo. */
export function dataSP(agora = new Date()) {
  const p = partesSP(agora);
  return `${p.year}-${p.month}-${p.day}`;
}

/** 'AAAA-MM-DD HH:mm:ss' no fuso de São Paulo — o formato do `nextDueDate` do checkout. */
export function dataHoraSP(agora = new Date()) {
  const p = partesSP(agora);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/* Soma meses a uma data 'AAAA-MM-DD', sem pular mês.

   `Date#setMonth` faz 31/01 + 1 mês = 03/03, porque fevereiro não tem 31. Num
   vencimento isso é cobrar dois dias depois do combinado e, pior, desalinhar
   todos os meses seguintes. Aqui o dia é limitado ao último do mês de destino:
   31/01 + 1 = 28/02 (ou 29). */
export function somarMeses(data, meses) {
  const [a, m, d] = String(data).slice(0, 10).split('-').map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}

/* --------------------------- CPF e CNPJ -------------------------------- */

export const soDigitos = (s) => String(s || '').replace(/\D/g, '');

function dvCpf(base) {
  let soma = 0;
  for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
  const r = (soma * 10) % 11;
  return r === 10 ? 0 : r;
}

function dvCnpj(base) {
  const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = base.split('').reduce((t, n, i) => t + Number(n) * pesos[i], 0);
  const r = soma % 11;
  return r < 2 ? 0 : 11 - r;
}

/* O Asaas recusa o cliente com documento inválido — mas recusa com um 400 que
   chega na tela como "não consegui gerar o Pix". Validar aqui deixa a tela
   dizer o que está errado ("confere o CPF") antes de gastar uma chamada. */
export function documentoValido(doc) {
  const d = soDigitos(doc);
  if (/^(\d)\1+$/.test(d)) return false;   // 111.111.111-11 passa no dígito, mas não existe
  if (d.length === 11) {
    return dvCpf(d.slice(0, 9)) === Number(d[9]) && dvCpf(d.slice(0, 10)) === Number(d[10]);
  }
  if (d.length === 14) {
    return dvCnpj(d.slice(0, 12)) === Number(d[12]) && dvCnpj(d.slice(0, 13)) === Number(d[13]);
  }
  return false;
}

/* ------------------------------ checkout ------------------------------- */

export const METODOS = Object.freeze({ CARTAO: 'cartao', PIX_AUTOMATICO: 'pix_automatico' });

/* Que tipo de checkout cada plano abre. Função pura pra que "o mensal aceita
   Pix?" tenha uma resposta escrita e testada, e não implícita num if da rota.

   O Asaas devolve 400 "CREDIT_CARD is the only payment method allowed for
   RECURRENT operations" se uma assinatura pedir Pix no checkout. O Pix mensal
   existe, mas é OUTRO produto (Pix Automático, com autorização no app do
   banco) e tem a sua própria rota: /api/checkout/pix-automatico. */
export function modalidadeDoCheckout(plan) {
  if (plan?.cycle) {
    return { billingTypes: ['CREDIT_CARD'], chargeTypes: ['RECURRENT'] };
  }
  return { billingTypes: ['PIX', 'CREDIT_CARD'], chargeTypes: ['DETACHED', 'INSTALLMENT'] };
}

/* O corpo de POST /v3/checkouts.

   `externalReference` = id da linha em `orders` que a rota grava antes. É ele
   (junto com o `checkoutSession` que volta em cada cobrança) que diz ao webhook
   de quem é o pagamento — o pagador pode digitar no checkout um e-mail
   diferente do da conta. */
export function corpoCheckoutAsaas({ plan, planId, orderId, baseUrl, cliente, agora = new Date() }) {
  const modalidade = modalidadeDoCheckout(plan);
  const corpo = {
    ...modalidade,
    minutesToExpire: 60,
    externalReference: orderId,
    callback: {
      successUrl: `${baseUrl}/obrigado`,
      // Desistir ou deixar expirar devolve pra onde a pessoa estava: o app. Quem
      // não tem conta é mandado pro login pelo middleware de qualquer jeito.
      cancelUrl: `${baseUrl}/v2`,
      expiredUrl: `${baseUrl}/v2`,
    },
    items: [{
      externalReference: planId,
      name: plan.name,
      description: plan.description,
      imageBase64: IMAGEM_DO_ITEM,
      quantity: 1,
      value: plan.price / 100,
    }],
  };

  if (modalidade.chargeTypes.includes('INSTALLMENT')) {
    // Mesma regra de antes: parcela mínima de R$ 10, teto 12. R$ 89,90 → 8x.
    corpo.installment = { maxInstallmentCount: maxInstallmentsFor(plan.price) };
  }
  if (modalidade.chargeTypes.includes('RECURRENT')) {
    // Primeiro vencimento = agora: a primeira mensalidade é cobrada ao concluir
    // o checkout, e as próximas no mesmo dia dos meses seguintes. Sem
    // `endDate` a assinatura vale até ser cancelada.
    corpo.subscription = { cycle: plan.cycle, nextDueDate: dataHoraSP(agora) };
  }

  // Pré-preenche o que a conta já sabe. CPF não: a gente não pede no cadastro,
  // e o checkout pergunta.
  const dados = {};
  if (cliente?.nome) dados.name = cliente.nome;
  if (cliente?.email) dados.email = cliente.email;
  if (Object.keys(dados).length) corpo.customerData = dados;

  return corpo;
}

/* ---------------------------- Pix Automático ---------------------------- */

/* O `contractId` aparece no app do banco da pessoa, na tela de autorizar. O id
   do pedido sem hífens (32 caracteres) cabe no limite de 35 dos
   identificadores do Pix e é o mesmo que está em `orders`. */
export const contratoDoPedido = (orderId) => String(orderId || '').replace(/-/g, '').slice(0, 35);

/* O corpo de POST /v3/pix/automatic/authorizations — Jornada 3: um QR Code que
   paga o PRIMEIRO mês na hora e, no mesmo gesto, autoriza os próximos.

   - `startDate` é o primeiro débito AUTOMÁTICO, não o de hoje: hoje é o QR
     imediato. Por isso um mês pra frente — com `startDate` hoje, a pessoa
     pagaria duas vezes no mesmo dia.
   - `paymentCreationMode: SUBSCRIPTION` faz o Asaas gerar as cobranças de cada
     mês sozinho. No MANUAL seria a gente, com um cron, entre 2 e 10 dias úteis
     antes de cada vencimento — mais uma peça pra quebrar em silêncio.
   - `retryPolicy`: sem saldo no dia, o banco tenta de novo até 3x em 7 dias
     antes de a mensalidade falhar. */
export function corpoAutorizacaoPix({ plan, customerId, orderId, agora = new Date() }) {
  const valor = plan.price / 100;
  return {
    frequency: plan.cycle,
    contractId: contratoDoPedido(orderId),
    startDate: somarMeses(dataSP(agora), 1),
    value: valor,
    description: plan.name,
    customerId,
    immediateQrCode: {
      expirationSeconds: 3600,
      originalValue: valor,
      description: `${plan.name} — 1º mês`,
    },
    paymentCreationMode: 'SUBSCRIPTION',
    retryPolicy: 'ALLOW_THREE_IN_SEVEN_DAYS',
  };
}

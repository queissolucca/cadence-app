/* Decisões puras do webhook do AbacatePay.
 *
 * Mora aqui, e não dentro da rota, por um motivo prático: a rota importa
 * next/server e só roda dentro do Next. Estas funções decidem QUEM ganha acesso
 * pago — a parte que mais precisa de teste — então elas ficam num módulo que os
 * testes conseguem importar de verdade, em vez de conferir texto do arquivo. */

import { classifyEvent } from './payments';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ---------------------------- que evento é este ---------------------------- */

/* Famílias de evento que movem dinheiro mas NÃO são alguém comprando:
   withdraw/payout/transfer é dinheiro SAINDO da conta AbacatePay pra conta
   bancária do dono da loja. O nome delas termina em ".completed", então
   qualquer teste de "parece pago" baseado em texto diz SIM pra elas — e aí o
   email que estivesse no payload (o do DONO da loja, tipicamente) ganharia
   acesso de graça. Por isso são barradas ANTES de qualquer outra regra. */
const FAMILIAS_QUE_NAO_SAO_COMPRA = /^(withdraw|payout|transfer|balance|cashout|settlement)\b/;

export function ehSaidaDeDinheiro(event) {
  return FAMILIAS_QUE_NAO_SAO_COMPRA.test(String(event || '').toLowerCase().trim());
}

/* Sinal de "pago" — pelo nome do evento ou por um status PAID/approved solto no
   payload. É a rede de segurança pros nomes de evento que ainda não conhecemos;
   só vale depois que ehSaidaDeDinheiro() descartou as famílias perigosas. */
export function looksPaid(body) {
  const event = String(body?.event || body?.type || '').toLowerCase();
  if (/paid|approved|confirmed|completed|success/.test(event)) return true;
  let found = false;
  const scan = (v, d = 0) => {
    if (found || v == null || d > 6) return;
    if (typeof v === 'string') { if (/^(paid|approved|confirmed|completed)$/i.test(v.trim())) found = true; return; }
    if (Array.isArray(v)) { v.forEach((x) => scan(x, d + 1)); return; }
    if (typeof v === 'object') {
      for (const k of Object.keys(v)) if (/status/i.test(k)) scan(v[k], d + 1);
      if (!found) for (const k of Object.keys(v)) scan(v[k], d + 1);
    }
  };
  scan(body);
  return found;
}

/* Só isto libera acesso: um evento de COMPRA. */
/* Os 16 eventos que a doc do AbacatePay lista como assinaveis. Serve pra
   separar "evento que o AbacatePay documenta" de "nome que nunca vimos" — e
   essa separacao e o que decide se a rede de seguranca vale. */
export const EVENTOS_OFICIAIS = Object.freeze([
  'checkout.completed', 'checkout.refunded', 'checkout.disputed', 'checkout.lost',
  'transparent.completed', 'transparent.refunded', 'transparent.disputed', 'transparent.lost',
  'subscription.completed', 'subscription.cancelled', 'subscription.renewed', 'subscription.trial_started',
  'payout.completed', 'payout.failed', 'transfer.completed', 'transfer.failed',
]);

/* So isto libera acesso: um evento de COMPRA.

   A ordem importa, e cada degrau existe por um motivo:

   1. Saque/repasse nunca e compra (o dinheiro esta SAINDO pra conta do dono da
      loja). Barrado antes de tudo.
   2. Se classifyEvent reconhece como pagamento, e pagamento.
   3. Se o evento esta na lista oficial e NAO foi reconhecido como pagamento,
      a resposta e NAO — ponto final. Aqui estava o furo: `looksPaid` varre o
      corpo atras de um status "PAID", e tanto um reembolso quanto um inicio de
      trial chegam com o status do pagamento original. Um reembolso liberava
      3 meses; um trial gratis tambem.
   4. Só um nome de evento que o AbacatePay NAO documenta cai na rede de
      seguranca do looksPaid — que e pra isso que ela existe. */
export function ehCompraPaga(event, body) {
  const e = String(event || '').toLowerCase().trim();
  if (ehSaidaDeDinheiro(e)) return false;
  if (classifyEvent(e) === 'grant') return true;
  if (EVENTOS_OFICIAIS.includes(e)) return false;
  return looksPaid(body);
}

/* ------------------------- de quem é este pagamento ------------------------ */

/* Procura um email em qualquer lugar do payload. É a ÚLTIMA opção de
   resolução: "qualquer email do payload" também acha o email da loja. */
export function deepFindEmail(v, depth = 0) {
  if (v == null || depth > 6) return null;
  if (typeof v === 'string') return EMAIL_RE.test(v.trim()) ? v.trim().toLowerCase() : null;
  if (Array.isArray(v)) {
    for (const x of v) { const e = deepFindEmail(x, depth + 1); if (e) return e; }
    return null;
  }
  if (typeof v === 'object') {
    for (const k of Object.keys(v)) if (/email/i.test(k)) { const e = deepFindEmail(v[k], depth + 1); if (e) return e; }
    for (const k of Object.keys(v)) { const e = deepFindEmail(v[k], depth + 1); if (e) return e; }
  }
  return null;
}

const limpo = (s) => (typeof s === 'string' && s.trim() ? s.trim() : null);

/* Ids da cobrança no payload (bill_..., pix_...). É o que amarra o evento ao
   pedido que /api/checkout gravou em orders.bill_id. */
export function idsDaCobranca(body) {
  const d = body?.data || {};
  return [d.checkout?.id, d.billing?.id, d.pixQrCode?.id, d.payment?.id, d.id, body?.id]
    .map(limpo).filter(Boolean);
}

/* externalId = o UUID da linha em orders que /api/checkout criou antes de
   mandar o cliente pro AbacatePay. Filtramos pra deixar só UUID de verdade:
   orders.id é coluna uuid, e mandar "cad_<user>_<timestamp>" (o fallback do
   checkout) faz o Postgres estourar 22P02 em vez de só não achar nada. */
export function externalIdsDoPayload(body) {
  const d = body?.data || {};
  return [d.checkout?.externalId, d.billing?.externalId, d.payment?.externalId, d.externalId]
    .map(limpo).filter(Boolean);
}

export function externalIdsConsultaveis(body) {
  return externalIdsDoPayload(body).filter((x) => UUID_RE.test(x));
}

/* O email do cliente quando o AbacatePay manda — data.customer pode vir null. */
export function emailDoCliente(body) {
  const e = limpo(body?.data?.customer?.metadata?.email) || limpo(body?.data?.customer?.email);
  return e && EMAIL_RE.test(e) ? normalizarEmail(e) : null;
}

/* paid_emails.email e chave primaria TEXT, e o middleware compara com
   .eq('email', user.email). "Erik@Gmail.com" e "erik@gmail.com" viram duas
   linhas diferentes, e a pessoa paga numa e e verificada na outra — fica sem
   acesso com o pagamento gravado. Tudo que entra passa por aqui. */
export function normalizarEmail(e) {
  return typeof e === 'string' ? e.trim().toLowerCase() : null;
}

/* ------------------------------- quanto e como ----------------------------- */

/* Valor pago (AbacatePay manda em CENTAVOS) — 1º número sob chaves de valor. */
export function deepFindAmount(v, depth = 0) {
  if (v == null || depth > 6) return null;
  if (Array.isArray(v)) { for (const x of v) { const a = deepFindAmount(x, depth + 1); if (a != null) return a; } return null; }
  if (typeof v === 'object') {
    for (const k of Object.keys(v)) if (/amount|value|total|paid/i.test(k) && typeof v[k] === 'number') return v[k];
    for (const k of Object.keys(v)) { const a = deepFindAmount(v[k], depth + 1); if (a != null) return a; }
  }
  return null;
}

/* Método de pagamento (PIX, cartão, boleto…). */
export function deepFindMethod(v, depth = 0) {
  if (v == null || depth > 6) return null;
  if (typeof v === 'string') return /^(pix|credit_card|creditcard|credit|card|boleto|debit|debit_card)$/i.test(v.trim()) ? v.trim() : null;
  if (Array.isArray(v)) { for (const x of v) { const m = deepFindMethod(x, depth + 1); if (m) return m; } return null; }
  if (typeof v === 'object') {
    for (const k of Object.keys(v)) if (/method|payment|kind|frequency/i.test(k)) { const m = deepFindMethod(v[k], depth + 1); if (m) return m; }
    for (const k of Object.keys(v)) { const m = deepFindMethod(v[k], depth + 1); if (m) return m; }
  }
  return null;
}

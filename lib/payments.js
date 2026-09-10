import crypto from 'node:crypto';

// Helpers puros de pagamento (sem I/O) — fáceis de testar isoladamente.

// Verifica a assinatura HMAC-SHA256 do CORPO CRU do webhook, em tempo constante.
// Retorna false pra assinatura/secret ausentes ou de tamanho diferente.
export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Máximo de parcelas: cada parcela precisa ter >= R$ 10 (1000 centavos), teto 12.
// Calculado a partir do preço em centavos (nunca cravado em 12).
export function maxInstallmentsFor(priceCents) {
  const byMin = Math.floor((Number(priceCents) || 0) / 1000);
  return Math.max(1, Math.min(12, byMin || 1));
}

// +3 meses a partir de `date` (default agora), como ISO string. Usado pra
// validade do acesso (paid_emails.expires_at).
export function threeMonthsFrom(date = new Date()) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 3);
  return d.toISOString();
}

// Classifica o evento do webhook em uma ação: liberar/renovar, revogar,
// cancelar (sem revogar já) ou ignorar.
export function classifyEvent(event) {
  const e = String(event || '').toLowerCase();
  // grant: cobre o checkout hospedado (checkout.completed) E o PIX do link
  // estático do AbacatePay (billing.paid / pix.paid / payment.*paid).
  if (/(checkout\.completed|subscription\.completed|subscription\.renewed|billing\.(recurring\.)?paid|pix\.paid|payment\.(approved|confirmed|paid|succeeded))/.test(e)) return 'grant';
  if (/(checkout\.refunded|checkout\.disputed|billing\.refunded|payment\.refunded)/.test(e)) return 'revoke';
  if (/subscription\.cancell?ed/.test(e)) return 'cancel';
  return 'ignore';
}

/* Qual método de pagamento o AbacatePay recusou.

   Ele rejeita o checkout INTEIRO se qualquer método pedido estiver desabilitado
   na loja, com um 400 do tipo "CARD is not available for this store". Quem
   chama usa isto pra tirar do pedido só o método recusado e tentar de novo, em
   vez de adivinhar.

   Devolve null quando a mensagem não é sobre método indisponível — aí o erro é
   outro e tem que subir, não ser mascarado por uma retentativa. */
export function metodoRecusado(mensagem, metodos = ['PIX', 'CARD']) {
  const msg = String(mensagem || '');
  if (!/not available|unavailable|disabled/i.test(msg)) return null;
  // \b pra "CARD" não casar dentro de "CARDHOLDER" nem "DISCARD".
  return metodos.find((m) => new RegExp(`\\b${m}\\b`, 'i').test(msg)) || null;
}

/* Monta o corpo do checkout do AbacatePay.

   Vive aqui, fora da rota, porque o FORMATO deste objeto já derrubou o botão de
   pagar duas vezes em produção, das duas por incoerência interna:

   1. pedir CARD numa loja sem cartão → "CARD is not available for this store";
   2. mandar `card.maxInstallments` sem CARD em `methods` →
      "card.maxInstallments requires CARD in methods".

   As duas eram invisíveis na leitura e óbvias num teste. Agora são. */
export function corpoCheckout({ prodId, methods, installments, externalId, baseUrl, metadata }) {
  return {
    items: [{ id: prodId, quantity: 1 }],
    methods,
    // O bloco `card` acompanha o método: sem CARD em methods ele não existe.
    ...(methods.includes('CARD') ? { card: { maxInstallments: installments } } : {}),
    externalId,
    returnUrl: `${baseUrl}/pagamento`,
    completionUrl: `${baseUrl}/obrigado`,
    metadata,
  };
}

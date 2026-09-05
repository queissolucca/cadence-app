import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { verifyWebhookSignature, threeMonthsFrom, classifyEvent } from '../../../../lib/payments';

export const dynamic = 'force-dynamic';

// Webhook do AbacatePay — chamado servidor-a-servidor quando um pagamento é
// confirmado. É ISSO que faltava: sem esta rota, ninguém grava o email em
// paid_emails depois do pagamento. O AbacatePay manda o segredo na query
// (?webhookSecret=...). Configure no painel do AbacatePay a URL:
//   https://SEU_DOMINIO/api/webhooks/abacatepay?webhookSecret=SEU_SEGREDO
// e defina ABACATEPAY_WEBHOOK_SECRET no Vercel com o mesmo valor.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Procura um email em qualquer lugar do payload (o AbacatePay costuma pôr em
// data.billing.customer.metadata.email, mas variamos defensivamente).
function deepFindEmail(v, depth = 0) {
  if (v == null || depth > 6) return null;
  if (typeof v === 'string') return EMAIL_RE.test(v.trim()) ? v.trim() : null;
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

// Valor pago (AbacatePay manda em CENTAVOS) — procura o 1º número sob chaves de
// valor. Convertemos pra reais (÷100).
function deepFindAmount(v, depth = 0) {
  if (v == null || depth > 6) return null;
  if (Array.isArray(v)) { for (const x of v) { const a = deepFindAmount(x, depth + 1); if (a != null) return a; } return null; }
  if (typeof v === 'object') {
    for (const k of Object.keys(v)) if (/amount|value|total|paid/i.test(k) && typeof v[k] === 'number') return v[k];
    for (const k of Object.keys(v)) { const a = deepFindAmount(v[k], depth + 1); if (a != null) return a; }
  }
  return null;
}

// Método de pagamento (PIX, cartão, boleto…) — procura uma string conhecida.
function deepFindMethod(v, depth = 0) {
  if (v == null || depth > 6) return null;
  if (typeof v === 'string') return /^(pix|credit_card|creditcard|credit|card|boleto|debit|debit_card)$/i.test(v.trim()) ? v.trim() : null;
  if (Array.isArray(v)) { for (const x of v) { const m = deepFindMethod(x, depth + 1); if (m) return m; } return null; }
  if (typeof v === 'object') {
    for (const k of Object.keys(v)) if (/method|payment|kind|frequency/i.test(k)) { const m = deepFindMethod(v[k], depth + 1); if (m) return m; }
    for (const k of Object.keys(v)) { const m = deepFindMethod(v[k], depth + 1); if (m) return m; }
  }
  return null;
}

// Sinal de "pago" — pelo event (billing.paid) ou por um status PAID/approved.
function looksPaid(body) {
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

export async function POST(request) {
  // Camada 1: secret na query (?webhookSecret=), como já configurado no painel.
  // Aceita x-abacate-secret por compat.
  const secret = request.nextUrl.searchParams.get('webhookSecret') || request.headers.get('x-abacate-secret') || '';
  const expectedSecret = process.env.ABACATEPAY_WEBHOOK_SECRET || '';
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'invalid_secret' }, { status: 401 });
  }

  // Corpo CRU — necessário pra validar o HMAC ANTES de qualquer parse.
  const raw = await request.text();

  // Camada 2: HMAC-SHA256 do corpo cru (X-Webhook-Signature). Se o AbacatePay
  // mandar o header, ele PRECISA bater; se não mandar, a query secret é o gate.
  // (Ver "o que está frágil": confirmar em dev mode se o header chega e então
  // tornar obrigatório.)
  const signature = request.headers.get('x-webhook-signature') || request.headers.get('x-signature') || '';
  if (signature && !verifyWebhookSignature(raw, signature, expectedSecret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  try { console.log('[abacatepay webhook]', String(body?.event || body?.type || '?'), JSON.stringify(body).slice(0, 1500)); } catch {}

  const admin = createAdminClient();

  // Dev mode: eventos de teste vêm com devMode:true. Em produção, não liberamos
  // acesso a partir de um evento de dev.
  const isProd = (process.env.VERCEL_ENV || process.env.NODE_ENV) === 'production';
  if (body?.devMode === true && isProd) {
    return NextResponse.json({ ok: true, note: 'dev_event_ignored_in_prod' });
  }

  // Idempotência: grava o id do evento (log_...) e ignora repetição (o
  // AbacatePay reenvia em caso de falha — não pode liberar/creditar 2x).
  const eventId = typeof body?.id === 'string' ? body.id : null;
  if (eventId) {
    const ins = await admin.from('webhook_events').insert({ id: eventId, event: String(body?.event || ''), provider: 'abacatepay' });
    if (ins.error && ins.error.code === '23505') {
      return NextResponse.json({ ok: true, note: 'duplicate_ignored' });
    }
    // outros erros (ex.: tabela ausente antes da migration) → segue best-effort
  }

  const event = String(body?.event || body?.type || '').toLowerCase();
  const email = (deepFindEmail(body) || '').toLowerCase().trim();
  const kind = classifyEvent(event);

  // Libera / renova acesso (expires_at = agora + 3 meses).
  if (kind === 'grant' || (!event && looksPaid(body))) {
    if (!email) return NextResponse.json({ ok: true, note: 'no_email_found' });
    const rawAmount = deepFindAmount(body);
    const amount = typeof rawAmount === 'number' ? Math.round(rawAmount) / 100 : null; // centavos → reais
    const method = deepFindMethod(body);
    const row = { email, provider: 'abacatepay', paid_at: new Date().toISOString(), expires_at: threeMonthsFrom() };
    if (amount != null) row.amount = amount;
    if (method) row.method = method;

    let res = await admin.from('paid_emails').upsert(row, { onConflict: 'email' });
    if (res.error) res = await admin.from('paid_emails').upsert({ email }, { onConflict: 'email' });
    if (res.error) return NextResponse.json({ error: 'save_failed', details: res.error.message }, { status: 500 });

    try { await admin.from('orders').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('email', email).eq('status', 'pending'); } catch { /* best-effort */ }
    return NextResponse.json({ ok: true, marked: email, amount, method });
  }

  // Revoga acesso (reembolso / disputa): expira agora.
  if (kind === 'revoke') {
    if (email) {
      try { await admin.from('paid_emails').update({ expires_at: new Date().toISOString() }).eq('email', email); } catch { /* best-effort */ }
      const status = event.includes('refunded') ? 'refunded' : 'disputed';
      try { await admin.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('email', email); } catch { /* best-effort */ }
    }
    return NextResponse.json({ ok: true, revoked: email || null });
  }

  // Cancelamento de assinatura: NÃO revoga agora — o acesso vale até expires_at.
  if (kind === 'cancel') {
    if (email) { try { await admin.from('orders').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('email', email); } catch { /* best-effort */ } }
    return NextResponse.json({ ok: true, note: 'subscription_cancelled_access_until_expiry' });
  }

  return NextResponse.json({ ok: true, note: 'unhandled_event', event });
}

import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { verifyWebhookSignature, threeMonthsFrom, classifyEvent } from '../../../../lib/payments';

export const dynamic = 'force-dynamic';

// Webhook do AbacatePay — chamado servidor-a-servidor quando um pagamento é
// confirmado. É ISSO que grava o email em paid_emails depois do pagamento. O
// AbacatePay manda o segredo na query (?webhookSecret=...). Configure no painel
// do AbacatePay a URL:
//   https://SEU_DOMINIO/api/webhooks/abacatepay?webhookSecret=SEU_SEGREDO
// e defina ABACATEPAY_WEBHOOK_SECRET no Vercel com o MESMO valor.
//
// DIAGNÓSTICO: abra a MESMA URL no navegador (GET) pra ver se as envs estão
// setadas, se as tabelas existem e os últimos eventos recebidos (com o
// desfecho de cada um). É o jeito de descobrir por que "paguei e não gravou".

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

// Confere o segredo (query ?webhookSecret= ou header x-abacate-secret).
function checkSecret(request) {
  const secret = request.nextUrl.searchParams.get('webhookSecret') || request.headers.get('x-abacate-secret') || '';
  const expected = process.env.ABACATEPAY_WEBHOOK_SECRET || '';
  return { ok: !!expected && secret === expected, hasEnv: !!expected };
}

// Registra TODA chamada recebida (payload cru + desfecho + email resolvido) em
// webhook_events — é o que permite enxergar por que algo não gravou. Degrada em
// silêncio se a migration 0032 (colunas raw/outcome/email) não tiver rodado.
async function logEvent(admin, { id, event, outcome, raw, email }) {
  const rich = { id, event: event || '', provider: 'abacatepay', outcome, email: email || null, raw, received_at: new Date().toISOString() };
  const r = await admin.from('webhook_events').upsert(rich, { onConflict: 'id' });
  if (r.error) {
    await admin.from('webhook_events').upsert({ id, event: event || '', provider: 'abacatepay' }, { onConflict: 'id' });
  }
}

export async function POST(request) {
  // Gate: segredo na query (?webhookSecret=), como configurado no painel.
  const { ok, hasEnv } = checkSecret(request);
  if (!ok) {
    return NextResponse.json({ error: hasEnv ? 'invalid_secret' : 'missing_env_ABACATEPAY_WEBHOOK_SECRET' }, { status: 401 });
  }

  // Corpo CRU — necessário pra validar o HMAC ANTES de qualquer parse.
  const raw = await request.text();

  // Assinatura HMAC (X-Webhook-Signature): só é OBRIGATÓRIA se você ligar
  // ABACATEPAY_REQUIRE_SIGNATURE=1. O AbacatePay autentica pelo ?webhookSecret=
  // e NÃO manda HMAC — exigir assinatura por padrão rejeitaria webhooks
  // válidos (401), que era justamente o que impedia a gravação.
  if (process.env.ABACATEPAY_REQUIRE_SIGNATURE === '1') {
    const signature = request.headers.get('x-webhook-signature') || request.headers.get('x-signature') || '';
    if (!verifyWebhookSignature(raw, signature, process.env.ABACATEPAY_WEBHOOK_SECRET || '')) {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
    }
  }

  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const admin = createAdminClient();
  const event = String(body?.event || body?.type || '').toLowerCase();
  const eventId = (typeof body?.id === 'string' && body.id) ? body.id : `evt_${randomUUID()}`;
  const email = (deepFindEmail(body) || '').toLowerCase().trim();

  try { console.log('[abacatepay webhook]', event || '?', 'email=', email || '-', JSON.stringify(body).slice(0, 1500)); } catch {}

  // Dev/sandbox: eventos de teste vêm com devMode:true. Em produção NÃO
  // liberamos acesso a partir de um teste — mas REGISTRAMOS, pra você ver no
  // diagnóstico que "chegou, mas era teste" (aí precisa pagar em modo real).
  const isProd = (process.env.VERCEL_ENV || process.env.NODE_ENV) === 'production';
  if (body?.devMode === true && isProd) {
    await logEvent(admin, { id: eventId, event, outcome: 'dev_ignored_in_prod', raw: body, email });
    return NextResponse.json({ ok: true, note: 'dev_event_ignored_in_prod' });
  }

  const kind = classifyEvent(event);

  // Revoga acesso (reembolso / disputa): expira agora. Checado ANTES do grant.
  if (kind === 'revoke') {
    if (email) {
      try { await admin.from('paid_emails').update({ expires_at: new Date().toISOString() }).eq('email', email); } catch { /* best-effort */ }
      const status = event.includes('refunded') ? 'refunded' : 'disputed';
      try { await admin.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('email', email); } catch { /* best-effort */ }
    }
    await logEvent(admin, { id: eventId, event, outcome: email ? 'revoked' : 'revoke_no_email', raw: body, email });
    return NextResponse.json({ ok: true, revoked: email || null });
  }

  // Cancelamento de assinatura: NÃO revoga agora — o acesso vale até expires_at.
  if (kind === 'cancel') {
    if (email) { try { await admin.from('orders').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('email', email); } catch { /* best-effort */ } }
    await logEvent(admin, { id: eventId, event, outcome: 'subscription_cancelled', raw: body, email });
    return NextResponse.json({ ok: true, note: 'subscription_cancelled_access_until_expiry' });
  }

  // Libera / renova acesso (expires_at = agora + 3 meses). Cobre tanto os
  // eventos de checkout quanto o PIX do link estático ("parece pago").
  if (kind === 'grant' || looksPaid(body)) {
    if (!email) {
      await logEvent(admin, { id: eventId, event, outcome: 'no_email_found', raw: body, email: null });
      return NextResponse.json({ ok: true, note: 'no_email_found' });
    }
    const rawAmount = deepFindAmount(body);
    const amount = typeof rawAmount === 'number' ? Math.round(rawAmount) / 100 : null; // centavos → reais
    const method = deepFindMethod(body);
    const full = { email, provider: 'abacatepay', paid_at: new Date().toISOString(), expires_at: threeMonthsFrom() };
    if (amount != null) full.amount = amount;
    if (method) full.method = method;

    // Escreve com degradação: 1) linha completa; 2) só email + validade (caso a
    // migration 0024 de amount/method/provider não tenha rodado); 3) só email
    // (garante o acesso de qualquer jeito).
    let res = await admin.from('paid_emails').upsert(full, { onConflict: 'email' });
    if (res.error) res = await admin.from('paid_emails').upsert({ email, paid_at: full.paid_at, expires_at: full.expires_at }, { onConflict: 'email' });
    if (res.error) res = await admin.from('paid_emails').upsert({ email }, { onConflict: 'email' });
    if (res.error) {
      await logEvent(admin, { id: eventId, event, outcome: `save_failed: ${res.error.message}`, raw: body, email });
      return NextResponse.json({ error: 'save_failed', details: res.error.message }, { status: 500 });
    }

    try { await admin.from('orders').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('email', email).eq('status', 'pending'); } catch { /* best-effort */ }
    await logEvent(admin, { id: eventId, event, outcome: 'granted', raw: body, email });
    return NextResponse.json({ ok: true, marked: email, amount, method });
  }

  await logEvent(admin, { id: eventId, event, outcome: 'unhandled_event', raw: body, email });
  return NextResponse.json({ ok: true, note: 'unhandled_event', event });
}

// Diagnóstico (SOMENTE LEITURA) — protegido pelo mesmo segredo. Abra no
// navegador a MESMA URL do webhook:
//   https://cadenceenglish.app/api/webhooks/abacatepay?webhookSecret=SEU_SEGREDO
// Mostra se as envs estão setadas, se as tabelas existem, e os últimos eventos
// recebidos (pra ver se o AbacatePay está chamando e com qual desfecho).
export async function GET(request) {
  const { ok, hasEnv } = checkSecret(request);
  if (!ok) return NextResponse.json({ error: hasEnv ? 'invalid_secret' : 'missing_env_ABACATEPAY_WEBHOOK_SECRET' }, { status: 401 });

  const out = {
    ok: true,
    env: {
      ABACATEPAY_WEBHOOK_SECRET: !!process.env.ABACATEPAY_WEBHOOK_SECRET,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_PAYMENT_LINK_URL: !!process.env.NEXT_PUBLIC_PAYMENT_LINK_URL,
    },
    isProd: (process.env.VERCEL_ENV || process.env.NODE_ENV) === 'production',
  };

  try {
    const admin = createAdminClient();
    // últimos eventos (tenta colunas ricas; cai pro básico se 0032 não rodou).
    let ev = await admin.from('webhook_events').select('id,event,outcome,email,received_at').order('received_at', { ascending: false }).limit(20);
    if (ev.error) ev = await admin.from('webhook_events').select('id,event,received_at').order('received_at', { ascending: false }).limit(20);
    out.webhook_events = ev.error ? { error: ev.error.message, hint: 'rode as migrations 0031 e 0032' } : ev.data;

    const paid = await admin.from('paid_emails').select('email,paid_at,expires_at,method,amount').order('paid_at', { ascending: false }).limit(20);
    out.paid_emails = paid.error ? { error: paid.error.message } : paid.data;
  } catch (e) {
    out.dbError = String(e?.message || e);
  }

  return NextResponse.json(out);
}

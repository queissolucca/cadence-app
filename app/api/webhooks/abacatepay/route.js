import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';

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
  const secret = request.nextUrl.searchParams.get('webhookSecret') || request.headers.get('x-abacate-secret') || '';
  if (!process.env.ABACATEPAY_WEBHOOK_SECRET || secret !== process.env.ABACATEPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'invalid_secret' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Loga o shape na 1ª vez pra você conferir nos logs da Vercel e refinar.
  try { console.log('[abacatepay webhook]', JSON.stringify(body).slice(0, 2000)); } catch {}

  const email = (deepFindEmail(body) || '').toLowerCase().trim();
  if (!email) return NextResponse.json({ ok: true, note: 'no_email_found' });

  if (looksPaid(body)) {
    const rawAmount = deepFindAmount(body);
    const amount = typeof rawAmount === 'number' ? Math.round(rawAmount) / 100 : null; // AbacatePay = centavos
    const method = deepFindMethod(body);
    // Acesso de 3 meses: paid_at = agora, expires_at = agora + 3 meses. Uma
    // renovação reescreve os dois (estende +3 meses a partir do pagamento).
    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + 3);
    const row = { email, provider: 'abacatepay', paid_at: now.toISOString(), expires_at: expires.toISOString() };
    if (amount != null) row.amount = amount;
    if (method) row.method = method;

    const admin = createAdminClient();
    // Tenta com as colunas novas (amount/method/provider/expires_at); se alguma
    // migration não rodou, cai pro upsert só com email (mantém pago, sem expiry).
    let res = await admin.from('paid_emails').upsert(row, { onConflict: 'email' });
    if (res.error) res = await admin.from('paid_emails').upsert({ email }, { onConflict: 'email' });
    if (res.error) return NextResponse.json({ error: 'save_failed', details: res.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, marked: email, amount, method });
  }

  return NextResponse.json({ ok: true, note: 'not_a_paid_event' });
}

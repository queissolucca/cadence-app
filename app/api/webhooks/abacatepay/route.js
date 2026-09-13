import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { verifyWebhookSignature, threeMonthsFrom, classifyEvent } from '../../../../lib/payments';
import {
  ehSaidaDeDinheiro, ehCompraPaga, deepFindEmail, deepFindAmount, deepFindMethod,
  idsDaCobranca, externalIdsConsultaveis, emailDoCliente,
} from '../../../../lib/webhookAbacate';

export const dynamic = 'force-dynamic';

// Webhook do AbacatePay — chamado servidor-a-servidor quando um pagamento é
// confirmado. É ISSO que grava o email em paid_emails depois do pagamento. O
// AbacatePay manda o segredo na query (?webhookSecret=...). Configure no painel
// do AbacatePay a URL:
//   https://heycady.com/api/webhooks/abacatepay?webhookSecret=SEU_SEGREDO
// e defina ABACATEPAY_WEBHOOK_SECRET no Vercel com o MESMO valor.
//
// DIAGNÓSTICO: abra a MESMA URL no navegador (GET) pra ver se as envs estão
// setadas, se as tabelas existem e os últimos eventos recebidos (com o
// desfecho de cada um). É o jeito de descobrir por que "paguei e não gravou".
//
// As decisões puras (é compra? de quem é?) moram em lib/webhookAbacate.js, que
// os testes conseguem importar. Aqui fica só o que toca rede e banco.

// Resolve o email POR ORDEM DE CONFIANÇA. O payload é a fonte MENOS confiável:
// data.customer vem null em vários eventos v2, e um email solto no JSON pode
// ser o da loja, não o do comprador. Então perguntamos ao NOSSO banco primeiro
// — nós mesmos gravamos o email do comprador em orders quando ele clicou em
// pagar, junto com o bill_id e o externalId que voltam neste payload.
async function resolverEmail(admin, body) {
  // (1) pelo id da cobrança — o vínculo mais forte que temos.
  const bills = idsDaCobranca(body);
  if (bills.length) {
    try {
      const r = await admin.from('orders').select('id,email,amount,plan').in('bill_id', bills).limit(1);
      const e = r.data?.[0]?.email?.trim();
      if (e) return { email: e, origem: 'orders.bill_id', pedido: r.data[0] };
    } catch { /* segue pras outras vias */ }
  }

  // (2) pelo externalId, que É o id (uuid) da linha em orders.
  for (const ext of externalIdsConsultaveis(body)) {
    try {
      const r = await admin.from('orders').select('id,email,amount,plan').eq('id', ext).limit(1);
      const e = r.data?.[0]?.email?.trim();
      if (e) return { email: e, origem: 'orders.externalId', pedido: r.data[0] };
    } catch { /* segue */ }
  }

  // (3) o cliente no payload, quando o AbacatePay manda.
  const doCliente = emailDoCliente(body);
  if (doCliente) return { email: doCliente, origem: 'payload.customer', pedido: null };

  // (4) qualquer email no payload — última tentativa.
  const solto = deepFindEmail(body);
  if (solto) return { email: solto, origem: 'payload.busca', pedido: null };

  return { email: null, origem: 'nenhuma', pedido: null };
}

// Confere o segredo (query ?webhookSecret= ou header x-abacate-secret).
function checkSecret(request) {
  const secret = request.nextUrl.searchParams.get('webhookSecret') || request.headers.get('x-abacate-secret') || '';
  const expected = process.env.ABACATEPAY_WEBHOOK_SECRET || '';
  return { ok: !!expected && secret === expected, hasEnv: !!expected, recebeu: secret.length };
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

// Uma chamada rejeitada por segredo errado NÃO passava por logEvent — morria no
// 401 antes de tudo. Resultado: um segredo trocado ficava invisível, e a tabela
// parecia vazia exatamente como se o AbacatePay nunca tivesse chamado. Dois
// problemas opostos com o mesmo visual. Agora registramos as rejeições também,
// agrupadas por HORA pra que uma tempestade de retries não vire milhares de
// linhas. Nunca gravamos o segredo recebido — só o tamanho dele.
async function logRejeicao(motivo, recebeu) {
  try {
    const admin = createAdminClient();
    const id = `rejeitado_${new Date().toISOString().slice(0, 13)}`; // rejeitado_2026-09-13T14
    let vezes = 1;
    try {
      const r = await admin.from('webhook_events').select('raw').eq('id', id).limit(1);
      const antes = Number(r.data?.[0]?.raw?.vezes);
      if (Number.isFinite(antes)) vezes = antes + 1;
    } catch { /* primeira rejeição desta hora */ }
    await logEvent(admin, {
      id,
      event: 'rejeitado',
      outcome: motivo,
      email: null,
      raw: { vezes, motivo, tamanho_do_segredo_recebido: recebeu, ultima: new Date().toISOString() },
    });
  } catch { /* logar nunca pode derrubar a resposta */ }
}

export async function POST(request) {
  // Gate: segredo na query (?webhookSecret=), como configurado no painel.
  const { ok, hasEnv, recebeu } = checkSecret(request);
  if (!ok) {
    const motivo = hasEnv ? 'invalid_secret' : 'missing_env_ABACATEPAY_WEBHOOK_SECRET';
    await logRejeicao(motivo, recebeu);
    return NextResponse.json({ error: motivo }, { status: 401 });
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
      await logRejeicao('invalid_signature', recebeu);
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

  try { console.log('[abacatepay webhook]', event || '?', JSON.stringify(body).slice(0, 1500)); } catch {}

  // Dev/sandbox: eventos de teste vêm com devMode:true. Em produção NÃO
  // liberamos acesso a partir de um teste — mas REGISTRAMOS, pra você ver no
  // diagnóstico que "chegou, mas era teste" (aí precisa pagar em modo real).
  const isProd = (process.env.VERCEL_ENV || process.env.NODE_ENV) === 'production';
  if (body?.devMode === true && isProd) {
    await logEvent(admin, { id: eventId, event, outcome: 'dev_ignored_in_prod', raw: body, email: null });
    return NextResponse.json({ ok: true, note: 'dev_event_ignored_in_prod' });
  }

  // Saída de dinheiro (saque/repasse pra conta do dono da loja): registra e não
  // faz mais nada. Nunca libera nem revoga acesso de ninguém.
  if (ehSaidaDeDinheiro(event)) {
    await logEvent(admin, { id: eventId, event, outcome: 'movimentacao_da_loja_ignorada', raw: body, email: null });
    return NextResponse.json({ ok: true, note: 'store_movement_ignored', event });
  }

  const kind = classifyEvent(event);
  const { email, origem, pedido } = await resolverEmail(admin, body);

  // Revoga acesso (reembolso / disputa): expira agora. Checado ANTES do grant.
  if (kind === 'revoke') {
    if (email) {
      try { await admin.from('paid_emails').update({ expires_at: new Date().toISOString() }).eq('email', email); } catch { /* best-effort */ }
      const status = event.includes('refunded') ? 'refunded' : 'disputed';
      try { await admin.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('email', email); } catch { /* best-effort */ }
    }
    await logEvent(admin, { id: eventId, event, outcome: email ? `revoked (via ${origem})` : 'revoke_no_email', raw: body, email });
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
  if (ehCompraPaga(event, body)) {
    if (!email) {
      await logEvent(admin, { id: eventId, event, outcome: 'no_email_found', raw: body, email: null });
      // 500 DE PROPÓSITO. Um pagamento chegou e não sabemos de quem é: se
      // respondermos 200, o AbacatePay marca como entregue e o evento some pra
      // sempre. Com erro ele reenvia, e a próxima tentativa costuma achar o
      // pedido em orders. O payload fica salvo em webhook_events dos dois jeitos.
      return NextResponse.json({ error: 'no_email_found' }, { status: 500 });
    }
    const rawAmount = deepFindAmount(body);
    const amount = typeof rawAmount === 'number' ? Math.round(rawAmount) / 100  // centavos → reais
      : (typeof pedido?.amount === 'number' ? pedido.amount : null);
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

    // Marca o pedido exato quando sabemos qual é; senão, os pendentes do email.
    try {
      if (pedido?.id) await admin.from('orders').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', pedido.id);
      else await admin.from('orders').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('email', email).eq('status', 'pending');
    } catch { /* best-effort */ }

    await logEvent(admin, { id: eventId, event, outcome: `granted (email via ${origem})`, raw: body, email });
    return NextResponse.json({ ok: true, marked: email, amount, method, via: origem });
  }

  await logEvent(admin, { id: eventId, event, outcome: 'unhandled_event', raw: body, email });
  return NextResponse.json({ ok: true, note: 'unhandled_event', event });
}

// Diagnóstico (SOMENTE LEITURA) — protegido pelo mesmo segredo. Abra no
// navegador a MESMA URL do webhook:
//   https://heycady.com/api/webhooks/abacatepay?webhookSecret=SEU_SEGREDO
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

    // Pedidos recentes — é por eles que o webhook descobre de quem é o
    // pagamento quando o payload não traz o email.
    const ord = await admin.from('orders').select('id,email,plan,status,bill_id,created_at').order('created_at', { ascending: false }).limit(20);
    out.orders = ord.error ? { error: ord.error.message } : ord.data;
  } catch (e) {
    out.dbError = String(e?.message || e);
  }

  return NextResponse.json(out);
}

import { NextResponse } from 'next/server';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { processarEvento } from '../../../../lib/webhookAsaas';
import { repoSupabase, registrarEvento } from '../../../../lib/asaasRepo';
import { buscarCliente, buscarAssinatura, ambiente } from '../../../../lib/asaas';

export const dynamic = 'force-dynamic';

// Webhook do Asaas — chamado servidor-a-servidor a cada evento de cobrança,
// checkout, assinatura e Pix Automático. É ISSO que grava em paid_emails.
//
// Configuração (feita por scripts/asaas-setup.mjs, ou à mão no painel em
// Integrações → Webhooks):
//   URL:   https://heycady.com/api/webhooks/asaas
//   Token: o mesmo valor de ASAAS_WEBHOOK_TOKEN na Vercel (32+ caracteres)
// O Asaas manda o token no header `asaas-access-token`.
//
// DIAGNÓSTICO: abra no navegador
//   https://heycady.com/api/webhooks/asaas?token=SEU_TOKEN
// pra ver as envs, os últimos eventos (com o desfecho de cada um), os acessos
// liberados e os pedidos. É o jeito de responder "paguei e não liberou".
//
// As decisões (é nosso? de quem é? até quando vale?) moram em
// lib/webhookAsaas.js, que os testes rodam inteiro com um banco falso.

function confere(recebido) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN || '';
  const r = Buffer.from(String(recebido || ''), 'utf8');
  const e = Buffer.from(esperado, 'utf8');
  // Tamanho diferente já é "não", e timingSafeEqual exige o mesmo tamanho.
  const ok = !!esperado && r.length === e.length && timingSafeEqual(r, e);
  return { ok, temEnv: !!esperado, tamanho: r.length };
}

// Rejeições também ficam registradas — agrupadas por hora, sem nunca gravar o
// token recebido. Sem isso um token trocado fica invisível: a tabela parece
// vazia como se o Asaas nunca tivesse chamado (lição do AbacatePay).
async function registrarRejeicao(motivo, tamanho) {
  try {
    const admin = createAdminClient();
    const id = `asaas_rejeitado_${new Date().toISOString().slice(0, 13)}`;
    let vezes = 1;
    try {
      const r = await admin.from('webhook_events').select('raw').eq('id', id).limit(1);
      const antes = Number(r.data?.[0]?.raw?.vezes);
      if (Number.isFinite(antes)) vezes = antes + 1;
    } catch { /* primeira desta hora */ }
    await registrarEvento(admin, {
      id, event: 'rejeitado', outcome: motivo, email: null,
      raw: { vezes, motivo, tamanho_do_token_recebido: tamanho, ultima: new Date().toISOString() },
    });
  } catch { /* nunca derruba a resposta */ }
}

export async function POST(request) {
  const { ok, temEnv, tamanho } = confere(request.headers.get('asaas-access-token'));
  if (!ok) {
    const motivo = temEnv ? 'token_invalido' : 'falta_env_ASAAS_WEBHOOK_TOKEN';
    await registrarRejeicao(motivo, tamanho);
    // 401 conta como falha pro Asaas, e 15 seguidas pausam a fila. Aqui é o
    // certo: token errado é configuração quebrada, e a fila pausada (com
    // e-mail de aviso do Asaas) é o alarme que faz alguém olhar.
    return NextResponse.json({ error: motivo }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    // 200: um corpo ilegível nunca vai ficar legível numa retentativa.
    return NextResponse.json({ ok: true, note: 'corpo_invalido' });
  }

  const admin = createAdminClient();
  const id = typeof body?.id === 'string' && body.id ? body.id : `asaas_${randomUUID()}`;
  const evento = String(body?.event || '');

  let resultado;
  try {
    resultado = await processarEvento(body, {
      repo: repoSupabase(admin),
      asaas: { buscarCliente, buscarAssinatura },
    });
  } catch (e) {
    // Exceção inesperada (bug nosso): registra e responde 200, pra não pausar
    // a fila de todo mundo por causa de um evento. O payload fica salvo e dá
    // pra reprocessar à mão.
    resultado = { status: 200, outcome: `erro_inesperado: ${String(e?.message || e).slice(0, 200)}` };
  }

  await registrarEvento(admin, { id, event: evento, outcome: resultado.outcome, raw: body, email: resultado.email });
  try { console.log('[asaas webhook]', evento, '→', resultado.outcome); } catch {}

  return NextResponse.json(
    { ok: resultado.status < 400, outcome: resultado.outcome },
    { status: resultado.status },
  );
}

// Diagnóstico (SOMENTE LEITURA), protegido pelo mesmo token, na query.
export async function GET(request) {
  const { ok, temEnv } = confere(request.nextUrl.searchParams.get('token'));
  if (!ok) return NextResponse.json({ error: temEnv ? 'token_invalido' : 'falta_env_ASAAS_WEBHOOK_TOKEN' }, { status: 401 });

  const out = {
    ok: true,
    env: {
      ASAAS_API_KEY: !!process.env.ASAAS_API_KEY,
      ASAAS_WEBHOOK_TOKEN: !!process.env.ASAAS_WEBHOOK_TOKEN,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || null,
    },
    // 'sandbox' em produção = ninguém está pagando de verdade.
    asaas: process.env.ASAAS_API_KEY ? ambiente() : null,
    isProd: (process.env.VERCEL_ENV || process.env.NODE_ENV) === 'production',
  };

  try {
    const admin = createAdminClient();
    const ev = await admin.from('webhook_events').select('id,event,outcome,email,received_at')
      .eq('provider', 'asaas').order('received_at', { ascending: false }).limit(30);
    out.webhook_events = ev.error ? { error: ev.error.message } : ev.data;

    const paid = await admin.from('paid_emails').select('email,paid_at,expires_at,method,amount,provider')
      .order('paid_at', { ascending: false }).limit(30);
    out.paid_emails = paid.error ? { error: paid.error.message } : paid.data;

    let ord = await admin.from('orders')
      .select('id,email,plan,status,bill_id,provider_customer_id,provider_subscription_id,created_at')
      .eq('provider', 'asaas').order('created_at', { ascending: false }).limit(20);
    if (ord.error) {
      ord = await admin.from('orders').select('id,email,plan,status,bill_id,created_at')
        .eq('provider', 'asaas').order('created_at', { ascending: false }).limit(20);
      out.migration_0042 = 'NÃO rodou (orders sem provider_customer_id/provider_subscription_id)';
    }
    out.orders = ord.error ? { error: ord.error.message } : ord.data;
  } catch (e) {
    out.dbError = String(e?.message || e);
  }

  return NextResponse.json(out);
}

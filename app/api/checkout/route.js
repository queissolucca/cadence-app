import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { getPlan } from '../../../lib/plans';
import { createCheckout } from '../../../lib/abacatepay';
import { maxInstallmentsFor } from '../../../lib/payments';

export const dynamic = 'force-dynamic';

// Base pública da app (returnUrl/completionUrl). Nunca hardcoded: vem de env
// (funciona em prod, preview e local); fallback pra origin da própria request.
function baseUrl(request) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/+$/, '');
  return request.nextUrl.origin;
}

// POST /api/checkout — cria um checkout hospedado no AbacatePay e devolve { url }.
// O cliente manda SÓ { planId }. Preço e prod_... nunca vêm do cliente.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { /* body vazio ok */ }

  const plan = getPlan(body?.planId);
  if (!plan) return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });
  if (!plan.prodId) {
    // Produto ainda não criado no AbacatePay / env não configurada.
    console.error('[checkout] produto não configurado — rode scripts/abacate-setup-products.mjs e defina ABACATEPAY_PROD_*');
    return NextResponse.json({ error: 'plan_not_configured' }, { status: 500 });
  }

  const admin = createAdminClient();

  // Registra a intenção de pagamento ANTES de redirecionar (best-effort: se a
  // tabela orders não existir ainda, não bloqueia o pagamento).
  let orderId = null;
  try {
    const { data: order, error } = await admin
      .from('orders')
      .insert({
        user_id: user.id,
        email: user.email,
        plan: body.planId,
        amount: plan.price / 100,
        currency: plan.currency,
        provider: 'abacatepay',
        status: 'pending',
      })
      .select('id')
      .single();
    if (!error) orderId = order?.id || null;
  } catch (e) {
    console.error('[checkout] falha ao gravar order (segue mesmo assim):', e?.message);
  }

  const base = baseUrl(request);
  const externalId = orderId || `cad_${user.id}_${Date.now()}`;

  // Assinatura (cycle) cobra 1x por ciclo — sem parcelamento; compra avulsa
  // parcela dinamicamente respeitando o mínimo de R$ 10 por parcela.
  const installments = plan.cycle ? 1 : maxInstallmentsFor(plan.price);
  const buildBody = (methods) => ({
    items: [{ id: plan.prodId, quantity: 1 }],
    methods,
    card: { maxInstallments: installments },
    externalId,
    returnUrl: `${base}/pagamento`,
    completionUrl: `${base}/obrigado`,
    // metadata amarra o webhook ao usuário (o acesso é por email).
    metadata: { userId: user.id, email: user.email, plan: body.planId },
  });

  // Diagnóstico: mostra QUAL produto/ciclo este deploy está usando.
  console.log('[checkout] criando', { plan: body.planId, prod: plan.prodId, cycle: plan.cycle });

  try {
    let checkout;
    try {
      checkout = await createCheckout(buildBody(['CARD', 'PIX']));
    } catch (e) {
      // Se a conta não tem PIX (ou PIX Automático), cai pra só cartão —
      // o checkout precisa funcionar de qualquer jeito.
      const msg = String(e?.apiError || e?.message || '');
      if (/pix/i.test(msg)) {
        console.warn('[checkout] PIX indisponível nesta conta, seguindo só com cartão:', msg);
        checkout = await createCheckout(buildBody(['CARD']));
      } else {
        throw e;
      }
    }

    if (orderId && checkout?.id) {
      try {
        await admin
          .from('orders')
          .update({ bill_id: checkout.id, checkout_url: checkout.url, updated_at: new Date().toISOString() })
          .eq('id', orderId);
      } catch { /* best-effort */ }
    }

    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    // Log detalhado no servidor; mensagem genérica pro cliente (nada de secret).
    console.error('[checkout] erro no AbacatePay:', e?.message, e?.apiError);
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 });
  }
}

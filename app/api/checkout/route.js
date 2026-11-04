import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { getPlan, planoVendavel } from '../../../lib/plans';
import { criarCheckout, linkDoCheckout } from '../../../lib/asaas';
import { corpoCheckoutAsaas } from '../../../lib/asaasPedido';
import { baseUrl, sandboxEmProducao, gravarPedido } from '../../../lib/asaasCheckout';

export const dynamic = 'force-dynamic';

// POST /api/checkout — cria um checkout hospedado no Asaas e devolve { url }.
// O cliente manda SÓ { planId }. Preço e forma de cobrança nunca vêm do cliente.
//
//   pro-trimestral → pagamento único, Pix ou cartão (até 8x)
//   pro-mensal     → assinatura no CARTÃO (renova todo mês)
//
// O mensal no Pix é outro fluxo — Pix Automático, com QR Code na nossa tela —
// e mora em /api/checkout/pix-automatico.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { /* body vazio ok */ }

  const planId = body?.planId;
  const plan = getPlan(planId);
  // `planoVendavel`: o semanal ainda está no mapa (pedidos antigos), mas não
  // se compra mais. Sem esta checagem bastaria mandar o id dele no POST.
  if (!plan || !planoVendavel(planId)) return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });

  if (!process.env.ASAAS_API_KEY) {
    console.error('[checkout] ASAAS_API_KEY não configurada na Vercel');
    return NextResponse.json({ error: 'plan_not_configured' }, { status: 500 });
  }
  if (sandboxEmProducao()) {
    console.error('[checkout] chave de SANDBOX em produção — ninguém pagaria de verdade. Recusado.');
    return NextResponse.json({ error: 'plan_not_configured' }, { status: 500 });
  }

  const admin = createAdminClient();

  // A intenção de pagamento é gravada ANTES de abrir o checkout: é o id dela
  // que volta em cada cobrança e diz ao webhook de quem é o pagamento.
  const orderId = await gravarPedido(admin, {
    user, planId, plan, metodo: plan.cycle ? 'cartao' : null,
  });
  if (!orderId) {
    /* Diferente do AbacatePay, aqui o pedido NÃO é opcional. Sem ele, a
       cobrança do mês 2 de uma assinatura não tem como achar o dono — o
       checkout do Asaas deixa o pagador digitar outro e-mail. Melhor não
       vender do que vender sem saber pra quem. */
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 });
  }

  let nome = null;
  try {
    const { data } = await admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    nome = data?.full_name || null;
  } catch { /* só pré-preenchimento */ }

  const montar = (cliente) => corpoCheckoutAsaas({
    plan, planId, orderId, baseUrl: baseUrl(request), cliente,
  });

  try {
    let checkout;
    try {
      checkout = await criarCheckout(montar({ nome, email: user.email }));
    } catch (e) {
      /* O pré-preenchimento é cortesia. Se o Asaas recusar os dados do cliente
         (ex.: exigir CPF junto do nome), tenta sem eles — o checkout pergunta.
         Qualquer outro 400 sobe: mascarar com retentativa esconderia o erro. */
      if (e?.status === 400 && /customer|cliente|cpf|cnpj|name|nome|e-?mail/i.test(String(e?.message))) {
        console.warn('[checkout] Asaas recusou o pré-preenchimento; tentando sem:', e.message);
        checkout = await criarCheckout(montar(null));
      } else {
        throw e;
      }
    }

    const url = linkDoCheckout(checkout);
    if (!url) throw new Error('Asaas não devolveu id nem link do checkout');

    try {
      await admin.from('orders')
        .update({ bill_id: checkout.id, checkout_url: url, updated_at: new Date().toISOString() })
        .eq('id', orderId);
    } catch { /* best-effort: o externalReference também amarra */ }

    return NextResponse.json({ url });
  } catch (e) {
    // Log detalhado no servidor; mensagem genérica pro cliente (nada de secret).
    console.error('[checkout] erro no Asaas:', e?.status, e?.message, JSON.stringify(e?.erros || []));
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 });
  }
}

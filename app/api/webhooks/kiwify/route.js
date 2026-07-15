import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';

// É isso que faz "só libera acesso pra quem pagou" ser de verdade (antes era
// um botão mockado que qualquer um podia chamar) — o Kiwify chama essa rota
// servidor a servidor quando uma venda é aprovada/reembolsada, e só a partir
// daqui o email entra (ou sai) de paid_emails.
const PAID_STATUSES = ['paid', 'approved', 'completed'];
const REVOKE_STATUSES = ['refunded', 'refused', 'chargedback', 'canceled', 'cancelled'];

// A doc pública do Kiwify pro webhook clássico de vendas (por produto, não a
// API "Conta Digital") não deixa claro se o token configurado no dashboard
// vem de volta na query string, num header ou no corpo — então aceita
// qualquer um dos três. Idem pro nome do campo de status/email: variações
// vistas em integrações reais (order_status vs status, customer.email vs
// Customer.email). Ajuste aqui se o payload real do seu webhook de teste
// vier diferente.
function extractToken(request, body) {
  return (
    request.nextUrl.searchParams.get('token') ||
    body?.token ||
    request.headers.get('x-kiwify-token') ||
    ''
  );
}

function extractEmail(body) {
  return body?.customer?.email || body?.Customer?.email || body?.email || null;
}

function extractStatus(body) {
  return String(body?.order_status || body?.status || body?.Status || '').toLowerCase();
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const token = extractToken(request, body);
  if (!process.env.KIWIFY_WEBHOOK_TOKEN || token !== process.env.KIWIFY_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const email = extractEmail(body)?.toLowerCase().trim();
  const status = extractStatus(body);

  if (!email) {
    return NextResponse.json({ error: 'missing_email' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (PAID_STATUSES.includes(status)) {
    await admin.from('paid_emails').upsert({ email }, { onConflict: 'email' });
  } else if (REVOKE_STATUSES.includes(status)) {
    await admin.from('paid_emails').delete().eq('email', email);
  }

  return NextResponse.json({ ok: true });
}

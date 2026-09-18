import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { acessoPagoDe } from '../../../../lib/acessoPago';

export const dynamic = 'force-dynamic';

// GET /api/checkout/status — usado pela página /obrigado pra saber quando o
// webhook liberou o acesso (pago E dentro da validade). Sem sessão → inativo.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ authenticated: false, active: false });

  /* A regra mora em lib/acessoPago.js, com os outros três leitores. O
     `.maybeSingle()` que estava aqui ERRA com mais de uma linha, e paid_emails
     passou a guardar uma por compra. */
  const acesso = await acessoPagoDe(supabase, user.email);
  // Dúvida vira "ainda não": esta rota é um polling, e a próxima batida
  // pergunta de novo. Dizer "liberado" por engano manda a pessoa pra uma tela
  // que vai barrá-la.
  return NextResponse.json({ authenticated: true, active: acesso === true });
}

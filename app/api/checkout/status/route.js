import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/checkout/status — usado pela página /obrigado pra saber quando o
// webhook liberou o acesso (pago E dentro da validade). Sem sessão → inativo.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ authenticated: false, active: false });

  const { data } = await supabase
    .from('paid_emails')
    .select('expires_at')
    .eq('email', user.email)
    .maybeSingle();

  const active = !!data && (!data.expires_at || new Date(data.expires_at) > new Date());
  return NextResponse.json({ authenticated: true, active });
}

import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { stampPasswordChange } from '../../../../../lib/passwordAccount';

export const dynamic = 'force-dynamic';

// POST → registra no banco que a senha acabou de ser definida pelo link de
// redefinição (/auth/nova-senha). Ali a troca em si acontece no cliente, com a
// sessão de recuperação (é o e-mail que prova quem é a pessoa, no lugar da
// senha antiga); esta rota só grava o histórico e o password_set_at.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  await stampPasswordChange(supabase, user, 'password_changed', 'reset_link');
  return NextResponse.json({ ok: true });
}

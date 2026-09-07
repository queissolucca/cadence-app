import { NextResponse } from 'next/server';
import { createClient as createStandaloneClient } from '@supabase/supabase-js';
import { createClient } from '../../../../lib/supabase/server';
import { hasPasswordFor, stampPasswordChange } from '../../../../lib/passwordAccount';

export const dynamic = 'force-dynamic';

// POST { currentPassword?, newPassword } → define ou redefine a senha da conta.
//
// A trava: se a conta JÁ tem senha, `currentPassword` é obrigatória e é
// validada de verdade antes de trocar. Quem entrou só por Google/link mágico
// ainda não tem senha — aí é só definir (a sessão em si já prova quem é).
export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : newPassword;

  if (newPassword.length < 6) return NextResponse.json({ error: 'weak_password' }, { status: 400 });
  // A confirmação é conferida no cliente, mas o servidor não confia nisso.
  if (newPassword !== confirmPassword) return NextResponse.json({ error: 'passwords_dont_match' }, { status: 400 });

  const hasPassword = await hasPasswordFor(supabase, user);

  if (hasPassword) {
    if (!currentPassword) return NextResponse.json({ error: 'current_password_required' }, { status: 400 });
    if (currentPassword === newPassword) return NextResponse.json({ error: 'same_password' }, { status: 400 });

    // Confere a senha atual num cliente isolado (persistSession: false) pra
    // não encostar nos cookies da sessão em curso. signOut com scope 'local'
    // só descarta a sessão criada aqui — 'global' (o default) revogaria TODAS
    // as sessões do usuário, inclusive a que está fazendo a troca.
    const checker = createStandaloneClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
    const { error: signInErr } = await checker.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInErr) {
      return NextResponse.json({ error: 'wrong_current_password' }, { status: 400 });
    }
    try {
      await checker.auth.signOut({ scope: 'local' });
    } catch {
      /* a sessão da checagem morre com o request de qualquer forma */
    }
  }

  const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
  if (updateErr) {
    return NextResponse.json({ error: 'update_failed', message: updateErr.message }, { status: 400 });
  }

  await stampPasswordChange(supabase, user, hasPassword ? 'password_changed' : 'password_set', 'ajustes');

  return NextResponse.json({ ok: true, hasPassword: true });
}

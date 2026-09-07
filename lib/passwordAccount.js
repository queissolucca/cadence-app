// Estado de senha da conta + gravação no banco. Compartilhado pelas rotas de
// /api/account/password e pela aba Perfil (server component).
//
// Depende da migration 0033_password_management.sql: profiles.password_set_at
// + a função has_password(). Tudo aqui degrada em silêncio se a migration
// ainda não rodou (o app continua funcionando, só sem a informação).

// Conta já tem senha? Fonte da verdade = has_password() (lê
// auth.users.encrypted_password, vazio pra quem só usa Google/link mágico).
// Fallback: profiles.password_set_at.
export async function hasPasswordFor(supabase, user) {
  const rpc = await supabase.rpc('has_password');
  if (!rpc.error && typeof rpc.data === 'boolean') return rpc.data;

  const prof = await supabase.from('profiles').select('password_set_at').eq('id', user.id).maybeSingle();
  return !!prof.data?.password_set_at;
}

export async function passwordStateFor(supabase, user) {
  const [hasPassword, prof] = await Promise.all([
    hasPasswordFor(supabase, user),
    supabase.from('profiles').select('password_set_at').eq('id', user.id).maybeSingle(),
  ]);
  return { hasPassword, passwordSetAt: prof.data?.password_set_at || null };
}

// Guarda no banco que a senha mudou: profiles.password_set_at (quando a senha
// atual foi definida) + uma linha em user_events (histórico). Best-effort: se
// a coluna/tabela não existir, a troca de senha não pode falhar por isso.
export async function stampPasswordChange(supabase, user, event, via) {
  try {
    await supabase.from('profiles').update({ password_set_at: new Date().toISOString() }).eq('id', user.id);
  } catch {
    /* best-effort */
  }
  try {
    await supabase.from('user_events').insert({
      user_id: user.id,
      event,
      path: via === 'reset_link' ? '/auth/nova-senha' : '/v2/ajustes',
      meta: { via },
    });
  } catch {
    /* best-effort */
  }
}

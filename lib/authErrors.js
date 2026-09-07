// Traduz os erros crus do Supabase Auth (inglês, técnicos) pra mensagens que
// fazem sentido pra quem está na tela. Compartilhado pelo /login, pela tela de
// nova senha e pelo diálogo de senha dos Ajustes.
export function friendlyAuthError(err) {
  const m = (typeof err === 'string' ? err : err?.message || '').toLowerCase();
  if (!m) return 'Não consegui agora. Tenta de novo.';
  if (m.includes('rate limit') || m.includes('only request this after')) return 'Muitos e-mails em pouco tempo. Espera alguns minutos e tenta de novo.';
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Falta confirmar seu e-mail — clica no link que te enviamos.';
  if (m.includes('already registered')) return 'Esse e-mail já tem conta. Entra com a senha ou pede um link de acesso.';
  if (m.includes('password should be at least') || m.includes('weak_password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('same as the old') || m.includes('should be different')) return 'A senha nova precisa ser diferente da atual.';
  if (m.includes('reauthentication')) return 'Por segurança, entra de novo na conta antes de trocar a senha.';
  if (m.includes('session') && m.includes('expired')) return 'O link expirou. Pede um novo link e tenta de novo.';
  return typeof err === 'string' ? err : err?.message || 'Não consegui agora. Tenta de novo.';
}

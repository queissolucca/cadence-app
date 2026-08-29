import { createClient } from '../../../../lib/supabase/server';
import { ConversarView } from '../../../../components/v2/ConversarView';

// Aba Conversar — a tela principal. Server component: pega o primeiro nome do
// usuário (pro agente falar "Hey Lucca!") e renderiza a view com o histórico de
// conversas ao lado + a conversa ao vivo.
export default async function ConversarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || '';

  return (
    <>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--ink)' }}>Conversar</h1>
        <p style={{ margin: '6px 0 18px', fontSize: 14, color: 'var(--ink-soft)' }}>
          Fale em inglês do jeito que der — o coach entende, responde e corrige na hora.
        </p>
      </div>
      <ConversarView firstName={firstName} />
    </>
  );
}

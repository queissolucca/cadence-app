import { createClient } from '../../../../lib/supabase/server';
import { ConversarView } from '../../../../components/v2/ConversarView';
import { loadMemoryBlock, buildOpeningGreeting } from '../../../../lib/memory';

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
  // Memória do usuário pra Cady já conhecer você na voz (best-effort).
  const memoryText = await loadMemoryBlock(supabase, user.id);
  // Saudação de abertura puxando a memória + dia da semana (Brasília). Sem
  // memória → '' e o cliente cai na saudação padrão.
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date());
  const openingGreeting = memoryText
    ? await buildOpeningGreeting(supabase, user.id, firstName, memoryText, { weekday })
    : '';

  return (
    <>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--ink)' }}>Conversar</h1>
        <p style={{ margin: '6px 0 18px', fontSize: 14, color: 'var(--ink-soft)' }}>
          Bora destravar seu inglês agora! Comece aos poucos, mas tenha cadência de continuar aprendendo! <strong style={{ color: 'var(--ink)' }}>Não pense muito, apenas clique e comece agora!</strong>
        </p>
      </div>
      <ConversarView firstName={firstName} memoryText={memoryText} openingGreeting={openingGreeting} />
    </>
  );
}

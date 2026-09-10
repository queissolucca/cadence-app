import { createClient } from '../../../../lib/supabase/server';
import { ConversarView } from '../../../../components/v2/ConversarView';
import { loadMemoryBlock } from '../../../../lib/memory';
import { identidade, perfilV2 } from '../../../../lib/sessaoServidor';

// Aba Conversar — a tela principal. Server component: pega o primeiro nome do
// usuário (pro agente falar "Hey Lucca!") e renderiza a view com o histórico de
// conversas ao lado + a conversa ao vivo.
//
// A SAUDAÇÃO PERSONALIZADA SAIU DAQUI. Ela é feita por uma chamada à Anthropic,
// e esperar por ela aqui atrasava o primeiro byte da tela mais usada do app em
// 1 a 3 segundos — por um texto que só é usado depois de a pessoa clicar em
// "falar". Agora quem busca é a ConversarView, ao montar, em paralelo com o
// resto (ver app/api/conversar/saudacao).
export default async function ConversarPage() {
  const supabase = createClient();
  const eu = await identidade();

  const [profile, memoryText] = await Promise.all([
    perfilV2(),
    // Memória do usuário pra Cady já conhecer você na voz (best-effort). É uma
    // consulta simples ao banco, barata — esta pode continuar no render.
    loadMemoryBlock(supabase, eu.id),
  ]);

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || '';

  return (
    <>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--ink)' }}>Conversar</h1>
        <p style={{ margin: '6px 0 18px', fontSize: 14, color: 'var(--ink-soft)' }}>
          Bora destravar seu inglês agora! Comece aos poucos, mas tenha cadência de continuar aprendendo! <strong style={{ color: 'var(--ink)' }}>Não pense muito, apenas clique e comece agora!</strong>
        </p>
      </div>
      <ConversarView firstName={firstName} memoryText={memoryText} />
    </>
  );
}

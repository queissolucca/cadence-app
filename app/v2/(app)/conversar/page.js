import { ConversationClient } from '../../../../components/v2/ConversationClient';

// Aba Conversar — a tela principal do app agora. Server component fino: só o
// título e o cliente de voz (que precisa ser client por causa do microfone /
// WebSocket do ElevenLabs).
export default function ConversarPage() {
  return (
    <>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--ink)' }}>Conversar</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-soft)' }}>
          Fale em inglês do jeito que der — o coach entende, responde e corrige na hora.
        </p>
      </div>
      <ConversationClient />
    </>
  );
}

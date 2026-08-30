'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';

// Título curtinho pra listar na barra lateral: pega a 1ª fala do usuário com
// substância; senão, cai pra data.
function deriveTitle(messages) {
  const firstYou = messages.find((m) => m.role === 'you' && (m.text || '').trim().split(/\s+/).length >= 3);
  if (firstYou) {
    const words = firstYou.text.trim().split(/\s+/).slice(0, 8).join(' ');
    return words.length > 60 ? `${words.slice(0, 60)}…` : words;
  }
  return `Conversa · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
}

function ConversationInner({ firstName, onSaved, agent, resumeContext, resumeTopic, resumeMessages, resumeId, unit, reviewItems }) {
  const isReview = Array.isArray(reviewItems) && reviewItems.length > 0;
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const startedAtRef = useRef(null);
  const messagesRef = useRef([]); // fonte da verdade pro save (closures não ficam stale)
  const scrollRef = useRef(null); // janela de transcrição com scroll próprio

  const conversation = useConversation({
    onConnect: () => {
      startedAtRef.current = Date.now();
      // Ao retomar, a transcrição já começa com o histórico antigo (continuidade
      // visual); as falas novas entram por cima.
      const base = Array.isArray(resumeMessages) ? resumeMessages : [];
      messagesRef.current = base;
      setTranscript(base);
      setErrorMsg('');
    },
    onDisconnect: () => {
      const startedAt = startedAtRef.current;
      startedAtRef.current = null;
      const messages = messagesRef.current;
      if (!startedAt) return;
      const seconds = Math.round((Date.now() - startedAt) / 1000);

      if (seconds >= 15) {
        fetch('/api/session/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'roleplay', mode: 'speaking', duration_seconds: seconds }),
        }).catch(() => {});
      }

      if (messages.length) {
        // Retomada: atualiza a MESMA conversa (anexa o novo trecho). Senão, cria.
        const req = resumeId
          ? fetch(`/api/conversations/${resumeId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages, ended_at: new Date().toISOString() }),
            })
          : fetch('/api/conversations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages,
                title: unit ? `Lição: ${unit.title}` : isReview ? 'Revisão com a Cady' : deriveTitle(messages),
                theme: unit ? unit.title : isReview ? 'Revisão' : agent?.name || null,
                started_at: new Date(startedAt).toISOString(),
                ended_at: new Date().toISOString(),
                duration_seconds: seconds,
              }),
            });
        req.then(() => onSaved && onSaved()).catch(() => {});
      }

      // Progresso da trilha: a lição conta como feita se rodou de verdade (>=30s).
      if (unit?.id && seconds >= 30) {
        fetch('/api/track/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unit_id: unit.id }),
        }).catch(() => {});
      }

      // Revisão falada: os cards treinados sobem de caixa (conta como acerto).
      if (isReview && seconds >= 20) {
        fetch('/api/review/practice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: reviewItems.map((it) => it.id).filter(Boolean) }),
        }).catch(() => {});
      }
    },
    onMessage: (msg) => {
      const text = msg?.message ?? msg?.text;
      if (!text) return;
      const role = msg?.source === 'user' ? 'you' : 'coach';
      const line = { role, text, at: new Date().toISOString() };
      messagesRef.current = [...messagesRef.current, line];
      setTranscript((t) => [...t, line]);
    },
    onError: () => setErrorMsg('Algo deu errado na conexão de voz. Tenta de novo.'),
    clientTools: {
      // A Cady chama isso quando o usuário pede pra salvar/memorizar algo —
      // vai pra aba Revisão. (Precisa do client tool 'save_to_review' declarado
      // no agente do ElevenLabs.)
      save_to_review: async ({ term, example, category } = {}) => {
        if (!term) return "I didn't catch what to save.";
        try {
          await fetch('/api/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ term, example, category }),
          });
          return 'Saved to your Revisão tab!';
        } catch {
          return "I couldn't save that right now, but let's keep going.";
        }
      },
    },
  });

  const start = useCallback(async () => {
    setErrorMsg('');
    setNotConfigured(false);
    setStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const res = await fetch('/api/convai/signed-url');
      if (res.status === 503) {
        setNotConfigured(true);
        return;
      }
      if (!res.ok) throw new Error('signed_url');
      const { signedUrl } = await res.json();
      const name = firstName || 'there';
      // Modo revisão falada: vira uma "lição guiada" cujo drill são os cards
      // salvos — reusa a mesma mecânica de lição (nenhuma seção nova no prompt).
      const reviewList = isReview
        ? reviewItems.map((it, i) => `${i + 1}) ${it.term}${it.example ? ` — e.g. "${it.example}"` : ''}`).join('  ')
        : '';
      const lessonUnit = unit
        || (isReview
          ? {
              title: 'your review',
              focus: 'the words and phrases you saved',
              context: 'your saved review list',
              drill: `Go through these saved items one at a time. For each, get ${name} to produce a correct, natural sentence using it: if they nail it, say so and move on; if not, correct briefly and have them try once more. Keep it snappy. Items: ${reviewList}`,
            }
          : null);
      // 1ª fala da Cady: lição abre no exercício; revisão abre no 1º card;
      // senão, saudação normal. Vai pra {{opening_line}} na First message.
      const openingLine = unit
        ? `Alright ${name}! Let's nail ${unit.focus}. Here's an example — ${unit.example} Now your turn: give me one like that!`
        : isReview
          ? `Alright ${name}, let's run through the ${reviewItems.length} ${reviewItems.length === 1 ? 'thing' : 'things'} you saved. First up — ${reviewItems[0].term}. Give me a fresh sentence using it!`
          : resumeContext
            ? `Hey ${name}! Let's pick up right where we left off.`
            : `Hi ${name}! I'm Cady, your English teacher! How's it going?`;
      await conversation.startSession({
        signedUrl,
        dynamicVariables: {
          opening_line: openingLine,
          ...(firstName ? { user_name: firstName } : {}),
          ...(agent?.name ? { agent_name: agent.name } : {}),
          ...(resumeContext ? { prior_context: resumeContext } : {}),
          ...(lessonUnit ? { unit_title: lessonUnit.title, unit_focus: lessonUnit.focus, unit_drill: lessonUnit.drill, unit_context: lessonUnit.context } : {}),
        },
      });
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'NotFoundError') {
        setErrorMsg('Preciso do microfone pra gente conversar. Libera o acesso e tenta de novo.');
      } else {
        setErrorMsg('Não consegui iniciar a conversa. Tenta de novo.');
      }
    } finally {
      setStarting(false);
    }
  }, [conversation, firstName, agent, resumeContext, unit, isReview, reviewItems]);

  const stop = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      /* já encerrada */
    }
  }, [conversation]);

  const toggleMute = useCallback(() => {
    try {
      conversation.setMuted(!conversation.isMuted);
    } catch {
      /* noop */
    }
  }, [conversation]);

  // A janela de transcrição acompanha a conversa sozinha (rola pro fim a cada
  // fala nova), sem empurrar a página inteira.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript, showTranscript]);

  const status = conversation.status; // 'disconnected' | 'connecting' | 'connected'
  const active = status === 'connected';
  const connecting = starting || status === 'connecting';
  const muted = active && conversation.isMuted;
  const speaking = active && conversation.isSpeaking;

  let statusLabel = unit ? 'Toque pra começar a lição' : isReview ? 'Toque pra revisar falando' : resumeTopic ? 'Toque pra continuar de onde parou' : agent ? `Toque pra falar com ${agent.name}` : 'Toque pra começar a falar';
  if (connecting) statusLabel = 'Conectando…';
  else if (muted) statusLabel = 'Microfone mudo — desmute para voltar a falar';
  else if (speaking) statusLabel = `${agent?.name || 'Coach'} falando…`;
  else if (active) statusLabel = 'Pode falar — estou ouvindo';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 18, paddingTop: 8 }}>
      {agent && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: agent.accent, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>
            {agent.name.charAt(0)}
          </span>
          <span style={{ fontSize: 14, color: 'var(--ink)' }}>
            <strong>{agent.name}</strong> <span style={{ color: 'var(--ink-soft)' }}>· {agent.role}</span>
          </span>
        </div>
      )}

      {resumeTopic && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--green-dark, var(--green))', background: 'var(--green-soft)', padding: '6px 12px', borderRadius: 999, maxWidth: '90%' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l-4-4 4-4M5 10h11a4 4 0 0 1 0 8h-2" /></svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Continuando: {resumeTopic}</span>
        </div>
      )}

      {isReview && !resumeTopic && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--green-dark, var(--green))', background: 'var(--green-soft)', padding: '6px 12px', borderRadius: 999, maxWidth: '90%' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v6h6M3.5 12a9 9 0 1 0 2-5.7L3 9" /></svg>
          <span>Revisando {reviewItems.length} {reviewItems.length === 1 ? 'card salvo' : 'cards salvos'}</span>
        </div>
      )}

      <button
        onClick={active ? stop : start}
        disabled={connecting}
        aria-label={active ? 'Encerrar conversa' : 'Começar conversa'}
        style={{
          width: 85, height: 85, borderRadius: '50%', border: 'none', cursor: connecting ? 'default' : 'pointer',
          display: 'grid', placeItems: 'center', position: 'relative',
          // Verde sólido nos dois modos (ícone branco sempre legível, tanto no
          // fundo claro quanto no escuro).
          background: active ? '#2E9E5B' : '#1E6B41', color: '#fff',
          boxShadow: speaking ? '0 0 0 12px rgba(46,158,91,0.22)' : '0 10px 30px rgba(0,0,0,0.22)',
          transition: 'box-shadow 180ms ease, background 180ms ease, transform 120ms ease',
          transform: connecting ? 'scale(0.97)' : 'scale(1)',
        }}
      >
        {active ? (
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="6" width="12" height="12" rx="2.5" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        )}
      </button>

      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink)', minHeight: 22, textAlign: 'center' }}>{statusLabel}</p>

      {active && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={toggleMute}
            aria-pressed={muted}
            title={muted ? 'Ativar microfone' : 'Mutar microfone'}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '9px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              border: muted ? '1.5px solid var(--green)' : '1.5px solid var(--line)',
              background: muted ? 'var(--green-soft)' : 'transparent',
              color: 'var(--ink)',
            }}
          >
            {muted ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 10.5V6a3 3 0 0 0-5.9-.7" />
                <path d="M5 11a7 7 0 0 0 10.3 6.2M19 11a7 7 0 0 0-.5-2.6M12 18v3" />
                <path d="M3 3l18 18" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            )}
            {muted ? 'Microfone mudo' : 'Mutar microfone'}
          </button>
          <button
            onClick={stop}
            style={{ background: 'transparent', border: '1.5px solid var(--line)', borderRadius: 999, padding: '9px 16px', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}
          >
            Encerrar
          </button>
        </div>
      )}

      {errorMsg && (
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--red, #c0392b)', textAlign: 'center', maxWidth: 320 }}>{errorMsg}</p>
      )}

      {notConfigured && (
        <div className="v2-card" style={{ maxWidth: 380, textAlign: 'left' }}>
          <strong style={{ fontSize: 14 }}>Agente de voz ainda não configurado</strong>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
            Falta plugar as chaves do ElevenLabs (<code>ELEVENLABS_API_KEY</code> e <code>ELEVENLABS_AGENT_ID</code>).
            Siga o passo a passo em <code>docs/elevenlabs-agent-setup.md</code>.
          </p>
        </div>
      )}

      {transcript.length > 0 && (
        <div style={{ width: '100%', maxWidth: 480, marginTop: 4 }}>
          <button
            onClick={() => setShowTranscript((v) => !v)}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-soft)', fontSize: 12.5, cursor: 'pointer', padding: 6 }}
          >
            {showTranscript ? 'Esconder transcrição' : 'Ver transcrição ao vivo'}
          </button>
          {showTranscript && (
            <div
              ref={scrollRef}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8,
                maxHeight: 'min(44vh, 340px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                padding: '10px 12px', borderRadius: 14, border: '1px solid var(--line)',
              }}
            >
              {transcript.map((line, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: line.role === 'you' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%', fontSize: 13.5, lineHeight: 1.45,
                    background: line.role === 'you' ? 'var(--green-soft)' : 'var(--v2-card-bg)',
                    color: line.role === 'you' ? 'var(--ink)' : 'var(--v2-card-fg)',
                    border: line.role === 'you' ? 'none' : '1px solid var(--line)',
                    borderRadius: 12, padding: '8px 12px',
                  }}
                >
                  {line.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ConversationClient({ firstName, onSaved, agent, resumeContext, resumeTopic, resumeMessages, resumeId, unit, reviewItems }) {
  return (
    <ConversationProvider>
      <ConversationInner firstName={firstName} onSaved={onSaved} agent={agent} resumeContext={resumeContext} resumeTopic={resumeTopic} resumeMessages={resumeMessages} resumeId={resumeId} unit={unit} reviewItems={reviewItems} />
    </ConversationProvider>
  );
}

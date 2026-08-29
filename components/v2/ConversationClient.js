'use client';

import { useCallback, useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';

// Agente de voz em tempo real (ElevenLabs Conversational AI). Foco 100% em
// falar: um botão de microfone grande, status ao vivo, e o texto fica "em
// segundo plano" (colapsado por padrão). Ao encerrar, registra uma sessão
// (kind 'roleplay') pra acender a sequência da semana — sem migration nova.
//
// IMPORTANTE: no @elevenlabs/react v1.x o useConversation SÓ funciona dentro
// de um <ConversationProvider> (senão joga erro no mount). Por isso o
// componente exportado só envolve o provider e o miolo real vive em
// ConversationInner.
function ConversationInner() {
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const startedAtRef = useRef(null);

  const conversation = useConversation({
    onConnect: () => {
      startedAtRef.current = Date.now();
      setErrorMsg('');
    },
    onDisconnect: () => {
      const startedAt = startedAtRef.current;
      startedAtRef.current = null;
      if (startedAt) {
        const seconds = Math.round((Date.now() - startedAt) / 1000);
        // Só conta como sessão do dia se a conversa durou de verdade (>15s),
        // pra um clique acidental não marcar a sequência.
        if (seconds >= 15) {
          fetch('/api/session/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind: 'roleplay', mode: 'speaking', duration_seconds: seconds }),
          }).catch(() => {});
        }
      }
    },
    onMessage: (msg) => {
      const text = msg?.message ?? msg?.text;
      if (!text) return;
      const role = msg?.source === 'user' ? 'you' : 'coach';
      setTranscript((t) => [...t, { role, text }]);
    },
    onError: () => setErrorMsg('Algo deu errado na conexão de voz. Tenta de novo.'),
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
      await conversation.startSession({ signedUrl });
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'NotFoundError') {
        setErrorMsg('Preciso do microfone pra gente conversar. Libera o acesso e tenta de novo.');
      } else {
        setErrorMsg('Não consegui iniciar a conversa. Tenta de novo.');
      }
    } finally {
      setStarting(false);
    }
  }, [conversation]);

  const stop = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      /* já encerrada */
    }
  }, [conversation]);

  const status = conversation.status; // 'disconnected' | 'connecting' | 'connected'
  const active = status === 'connected';
  const connecting = starting || status === 'connecting';
  const speaking = active && conversation.isSpeaking;

  let statusLabel = 'Toque pra começar a falar';
  if (connecting) statusLabel = 'Conectando…';
  else if (speaking) statusLabel = 'Coach falando…';
  else if (active) statusLabel = 'Pode falar — estou ouvindo';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, paddingTop: 12 }}>
      {/* Botão-orbe de microfone */}
      <button
        onClick={active ? stop : start}
        disabled={connecting}
        aria-label={active ? 'Encerrar conversa' : 'Começar conversa'}
        className={active ? 'orb orb-active' : 'orb'}
        style={{
          width: 168, height: 168, borderRadius: '50%', border: 'none', cursor: connecting ? 'default' : 'pointer',
          display: 'grid', placeItems: 'center', position: 'relative',
          background: active ? 'var(--green)' : 'var(--ink)', color: '#fff',
          boxShadow: speaking ? '0 0 0 12px rgba(62,155,95,0.18)' : '0 10px 30px rgba(0,0,0,0.18)',
          transition: 'box-shadow 180ms ease, background 180ms ease, transform 120ms ease',
          transform: connecting ? 'scale(0.97)' : 'scale(1)',
        }}
      >
        {active ? (
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="6" width="12" height="12" rx="2.5" />
          </svg>
        ) : (
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        )}
      </button>

      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink)', minHeight: 22 }}>{statusLabel}</p>

      {active && (
        <button
          onClick={stop}
          style={{ background: 'transparent', border: '1.5px solid var(--line)', borderRadius: 999, padding: '8px 18px', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}
        >
          Encerrar
        </button>
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

      {/* Transcrição — em segundo plano, colapsada */}
      {transcript.length > 0 && (
        <div style={{ width: '100%', maxWidth: 480, marginTop: 8 }}>
          <button
            onClick={() => setShowTranscript((v) => !v)}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-soft)', fontSize: 12.5, cursor: 'pointer', padding: 6 }}
          >
            {showTranscript ? 'Esconder transcrição' : 'Ver transcrição'}
          </button>
          {showTranscript && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              {transcript.map((line, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: line.role === 'you' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%', fontSize: 13.5, lineHeight: 1.45,
                    background: line.role === 'you' ? 'var(--green-soft)' : 'var(--surface, #f4f4f2)',
                    color: 'var(--ink)', borderRadius: 12, padding: '8px 12px',
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

export function ConversationClient() {
  return (
    <ConversationProvider>
      <ConversationInner />
    </ConversationProvider>
  );
}

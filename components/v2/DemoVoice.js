'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';

function Inner({ onEnd }) {
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState('');
  const [notConf, setNotConf] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const scrollRef = useRef(null);

  const conv = useConversation({
    onMessage: (msg) => {
      const text = msg?.message ?? msg?.text;
      if (!text) return;
      const role = msg?.source === 'user' ? 'you' : 'cady';
      setTranscript((t) => [...t, { role, text }]);
    },
    onDisconnect: () => { onEnd && onEnd(); },
    onError: () => setErr('Deu um probleminha na conexão. Tenta de novo.'),
  });

  const start = useCallback(async () => {
    setErr(''); setNotConf(false); setStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const res = await fetch('/api/convai/demo-signed-url');
      if (res.status === 503) { setNotConf(true); return; }
      if (res.status === 429) { setErr('Você já testou algumas vezes 😅 Cria a conta pra continuar falando com a Cady!'); return; }
      if (!res.ok) throw new Error('signed_url');
      const { signedUrl } = await res.json();
      await conv.startSession({ signedUrl });
    } catch (e) {
      if (e?.name === 'NotAllowedError' || e?.name === 'NotFoundError') setErr('Preciso do microfone pra gente falar. Libera o acesso e tenta de novo.');
      else setErr('Não consegui iniciar. Tenta de novo.');
    } finally {
      setStarting(false);
    }
  }, [conv]);

  const stop = useCallback(async () => { try { await conv.endSession(); } catch { /* já encerrada */ } }, [conv]);

  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [transcript]);

  const status = conv.status;
  const active = status === 'connected';
  const connecting = starting || status === 'connecting';
  const speaking = active && conv.isSpeaking;
  let label = 'Toque e fale com a Cady';
  if (connecting) label = 'Conectando…';
  else if (speaking) label = 'Cady falando…';
  else if (active) label = 'Pode falar — estou ouvindo';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <button
        onClick={active ? stop : start}
        disabled={connecting}
        aria-label={active ? 'Encerrar' : 'Falar'}
        style={{
          width: 110, height: 110, borderRadius: '50%', border: 'none', cursor: connecting ? 'default' : 'pointer',
          display: 'grid', placeItems: 'center', margin: '10px 0 12px', background: active ? '#2E9E5B' : '#1E6B41', color: '#fff',
          boxShadow: speaking ? '0 0 0 14px rgba(46,158,91,0.2)' : '0 10px 30px rgba(46,158,91,0.28)',
          transition: 'box-shadow .2s ease, transform .12s ease', transform: connecting ? 'scale(0.97)' : 'scale(1)',
        }}
      >
        {active ? (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2.5" /></svg>
        ) : (
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
        )}
      </button>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)', minHeight: 22, textAlign: 'center' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>uma amostra rapidinha (~30s)</p>

      {err && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#c0392b', textAlign: 'center', maxWidth: 300 }}>{err}</p>}
      {notConf && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center', maxWidth: 300 }}>Demo de voz ainda não configurado. Tente o modo Escrever 🙂</p>}

      {transcript.length > 0 && (
        <div ref={scrollRef} style={{ width: '100%', maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {transcript.map((line, i) => (
            <div key={i} style={{ alignSelf: line.role === 'you' ? 'flex-end' : 'flex-start', maxWidth: '85%', fontSize: 14, lineHeight: 1.45, background: line.role === 'you' ? 'var(--green-soft)' : 'var(--v2-card-bg)', color: 'var(--ink)', border: line.role === 'you' ? 'none' : '1px solid var(--line)', borderRadius: 12, padding: '8px 12px' }}>
              {line.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DemoVoice({ onEnd }) {
  return (
    <ConversationProvider>
      <Inner onEnd={onEnd} />
    </ConversationProvider>
  );
}

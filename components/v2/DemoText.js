'use client';

import { useEffect, useRef, useState } from 'react';

const GREETING = "Hi! I'm Cady 👋 Just try in English — what did you do today?";
const SUGG = ['I go to work', 'I studied a little', 'I stayed home'];
const MAX_TURNS = 3;

export function DemoText({ onEnd }) {
  const [messages, setMessages] = useState([{ role: 'cady', text: GREETING }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ended, setEnded] = useState(false);
  const [err, setErr] = useState('');
  const turns = useRef(0);
  const scrollRef = useRef(null);

  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, sending]);

  const send = async (text) => {
    text = (text || '').trim();
    if (!text || sending || ended) return;
    setErr('');
    const withYou = [...messages, { role: 'you', text }];
    setMessages(withYou);
    setInput('');
    setSending(true);
    turns.current += 1;
    const history = withYou.map((m) => ({ role: m.role === 'you' ? 'user' : 'assistant', content: m.text }));
    try {
      const res = await fetch('/api/demo/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }) });
      if (res.status === 429) { setErr('Você já testou algumas vezes 😅 Cria a conta pra continuar!'); setEnded(true); onEnd && onEnd(); return; }
      if (!res.ok) throw new Error('chat');
      const { reply } = await res.json();
      setMessages((m) => [...m, { role: 'cady', text: reply }]);
      if (turns.current >= MAX_TURNS) { setEnded(true); onEnd && onEnd(); }
    } catch {
      setErr('Não consegui responder agora. Tenta de novo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div ref={scrollRef} style={{ display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 320, overflowY: 'auto', padding: '4px 0 8px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'you' ? 'flex-end' : 'flex-start', maxWidth: '85%', fontSize: 14.5, lineHeight: 1.5, background: m.role === 'you' ? 'var(--green-soft)' : 'var(--v2-card-bg)', color: 'var(--ink)', border: m.role === 'you' ? 'none' : '1px solid var(--line)', borderRadius: 14, padding: '9px 13px', whiteSpace: 'pre-wrap' }}>
            {m.text}
          </div>
        ))}
        {sending && <div style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--ink-soft)', padding: '4px 2px' }}>Cady está digitando…</div>}
      </div>

      {err && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#c0392b' }}>{err}</p>}

      {!ended && (
        <>
          {turns.current === 0 && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', padding: '8px 0 0' }}>
              {SUGG.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} style={{ border: '1px solid var(--line)', background: 'var(--v2-card-bg)', color: 'var(--ink)', borderRadius: 999, padding: '7px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0 0' }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(input); }} placeholder="responda em inglês…" style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 14, padding: '11px 14px', fontSize: 14.5, background: 'var(--v2-card-bg)', color: 'var(--ink)' }} />
            <button type="button" onClick={() => send(input)} disabled={sending || !input.trim()} aria-label="Enviar" style={{ width: 44, height: 44, borderRadius: 13, border: 'none', background: sending || !input.trim() ? 'var(--line)' : 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

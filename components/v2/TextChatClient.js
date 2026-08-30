'use client';

import { useEffect, useRef, useState } from 'react';

function deriveTitle(messages) {
  const firstYou = messages.find((m) => m.role === 'you' && (m.text || '').trim().split(/\s+/).length >= 2);
  if (firstYou) {
    const words = firstYou.text.trim().split(/\s+/).slice(0, 8).join(' ');
    return words.length > 60 ? `${words.slice(0, 60)}…` : words;
  }
  return `Chat · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
}

// Conversa aberta por TEXTO — a Cady via Claude (Haiku, barato). Corrige inline,
// salva na Revisão sozinha (tool server-side), e conta streak/histórico igual à
// conversa por voz. Alternativa ao microfone dentro da mesma aba.
export function TextChatClient({ firstName, agent, onSaved, initialMessages, resumeId, resumeTopic, unit }) {
  const name = firstName || '';
  const resuming = Array.isArray(initialMessages) && initialMessages.length > 0;
  const greeting = unit
    ? `Alright ${name || 'there'}! Let's nail ${unit.focus}. Here's an example — ${unit.example} Now your turn: write one like that!`
    : `Hi ${name || 'there'}! I'm Cady. What do you wanna talk about today?`;
  const [messages, setMessages] = useState(
    resuming
      ? initialMessages.map((m) => ({ role: m.role === 'you' ? 'you' : 'coach', text: m.text }))
      : [{ role: 'coach', text: greeting }],
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedFlash, setSavedFlash] = useState(0);

  // Ao retomar, escreve na MESMA conversa (anexa o novo trecho).
  const convIdRef = useRef(resuming ? resumeId || null : null);
  const startedAtRef = useRef(Date.now());
  const streakDoneRef = useRef(false);
  const progressDoneRef = useRef(false);
  const userCountRef = useRef(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const persist = async (msgs) => {
    if (convIdRef.current) {
      fetch(`/api/conversations/${convIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, ended_at: new Date().toISOString() }),
      }).catch(() => {});
      return;
    }
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: msgs,
          title: unit ? `Lição: ${unit.title}` : deriveTitle(msgs),
          theme: unit ? unit.title : 'Cady · texto',
          started_at: new Date(startedAtRef.current).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: 0,
        }),
      });
      if (res.ok) {
        const { id } = await res.json();
        convIdRef.current = id;
        onSaved && onSaved();
      }
    } catch {
      /* noop */
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setErrorMsg('');
    const withYou = [...messages, { role: 'you', text }];
    setMessages(withYou);
    setInput('');
    setSending(true);
    userCountRef.current += 1;

    const history = withYou.map((m) => ({ role: m.role === 'you' ? 'user' : 'assistant', content: m.text }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          ...(unit ? { unit: { title: unit.title, focus: unit.focus, context: unit.context, drill: unit.drill } } : {}),
        }),
      });
      if (res.status === 503) {
        setNotConfigured(true);
        return;
      }
      if (!res.ok) throw new Error('chat');
      const { reply, saved } = await res.json();
      const withReply = [...withYou, { role: 'coach', text: reply }];
      setMessages(withReply);
      if (Array.isArray(saved) && saved.length) setSavedFlash((n) => n + saved.length);

      persist(withReply);
      // Só conta pro streak se foi atividade real: uma lição de fato (>=4 trocas)
      // ou uma conversa aberta com troca real (>=2 mensagens suas).
      const streakQualifies = unit ? userCountRef.current >= 4 : userCountRef.current >= 2;
      if (streakQualifies && !streakDoneRef.current) {
        streakDoneRef.current = true;
        const secs = Math.round((Date.now() - startedAtRef.current) / 1000);
        fetch('/api/session/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'roleplay', mode: 'writing', duration_seconds: Math.max(secs, 30) }),
        }).catch(() => {});
      }
      // Lição da trilha por escrita: conta como feita depois de um drill real.
      if (unit?.id && userCountRef.current >= 4 && !progressDoneRef.current) {
        progressDoneRef.current = true;
        fetch('/api/track/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unit_id: unit.id }),
        }).catch(() => {});
      }
    } catch {
      setErrorMsg('Não consegui responder agora. Tenta de novo.');
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (notConfigured) {
    return (
      <div className="v2-card" style={{ maxWidth: 420, margin: '0 auto', textAlign: 'left' }}>
        <strong style={{ fontSize: 14 }}>Chat de texto ainda não configurado</strong>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
          Falta a chave <code>ANTHROPIC_API_KEY</code> nas variáveis de ambiente do Vercel. Adicione e faça um redeploy.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 620, margin: '0 auto', gap: 12 }}>
      {agent && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'center' }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: agent.accent, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>
            {agent.name.charAt(0)}
          </span>
          <span style={{ fontSize: 14, color: 'var(--ink)' }}>
            <strong>{agent.name}</strong> <span style={{ color: 'var(--ink-soft)' }}>· escrevendo com você</span>
          </span>
        </div>
      )}

      {resuming && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'center', fontSize: 12.5, color: 'var(--green-dark, var(--green))', background: 'var(--green-soft)', padding: '6px 12px', borderRadius: 999, maxWidth: '90%' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l-4-4 4-4M5 10h11a4 4 0 0 1 0 8h-2" /></svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Continuando: {resumeTopic || 'sua conversa'}</span>
        </div>
      )}

      <div
        ref={scrollRef}
        style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          height: 'min(56vh, 460px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          padding: '12px', borderRadius: 16, border: '1px solid var(--line)', background: 'var(--v2-card-bg)',
        }}
      >
        {messages.map((line, i) => (
          <div
            key={i}
            style={{
              alignSelf: line.role === 'you' ? 'flex-end' : 'flex-start',
              maxWidth: '85%', fontSize: 14.5, lineHeight: 1.5,
              background: line.role === 'you' ? 'var(--green-soft)' : 'var(--v2-card-bg)',
              color: line.role === 'you' ? 'var(--ink)' : 'var(--v2-card-fg)',
              border: line.role === 'you' ? 'none' : '1px solid var(--line)',
              borderRadius: 14, padding: '9px 13px', whiteSpace: 'pre-wrap',
            }}
          >
            {line.text}
          </div>
        ))}
        {sending && (
          <div style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--ink-soft)', padding: '6px 4px' }}>
            {agent?.name || 'Cady'} está digitando…
          </div>
        )}
      </div>

      {savedFlash > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'center', fontSize: 12.5, color: 'var(--green-dark, var(--green))', background: 'var(--green-soft)', padding: '5px 12px', borderRadius: 999 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
          {savedFlash} {savedFlash === 1 ? 'item guardado' : 'itens guardados'} na Revisão
        </div>
      )}

      {errorMsg && <p style={{ margin: 0, fontSize: 13, color: 'var(--red, #c0392b)', textAlign: 'center' }}>{errorMsg}</p>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Escreva em inglês… (Enter envia)"
          style={{
            flex: 1, resize: 'none', border: '1px solid var(--line)', borderRadius: 14, padding: '11px 14px',
            fontSize: 14.5, lineHeight: 1.4, color: 'var(--v2-card-fg, var(--ink))', background: 'var(--v2-card-bg)',
            maxHeight: 120, fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !input.trim()}
          aria-label="Enviar"
          style={{
            width: 46, height: 46, borderRadius: 14, border: 'none', flexShrink: 0,
            cursor: sending || !input.trim() ? 'default' : 'pointer',
            background: sending || !input.trim() ? 'var(--line)' : 'var(--green)', color: '#fff',
            display: 'grid', placeItems: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
        </button>
      </div>
    </div>
  );
}

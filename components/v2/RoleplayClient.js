'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeechRecognition } from '../../lib/useSpeechRecognition';
import { BackHeader } from './BackHeader';

export function RoleplayClient({ scenarioTitle, accent }) {
  const router = useRouter();
  const lang = accent === 'uk' ? 'en-GB' : 'en-US';
  const speech = useSpeechRecognition({ lang });

  const [starting, setStarting] = useState(true);
  const [startError, setStartError] = useState(false);
  const [session, setSession] = useState(null); // { id, character, turns_target }
  const [thread, setThread] = useState([]); // [{role:'ai'|'user'|'fix', text, praise?, correction?}]
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [missionComplete, setMissionComplete] = useState(false);
  const [summaryFixes, setSummaryFixes] = useState([]);
  const [finishing, setFinishing] = useState(false);

  const statsRef = useRef({ startedAt: Date.now() });
  const scrollRef = useRef(null);

  useEffect(() => {
    const start = async () => {
      try {
        const res = await fetch('/api/v2/roleplay/start', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'start_failed');
        setSession(data);
        setThread([{ role: 'ai', text: data.opening_en }]);
      } catch {
        setStartError(true);
      }
      setStarting(false);
    };
    start();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [thread]);

  const answerText = speech.transcript || input;

  const send = async () => {
    const text = answerText.trim();
    if (!text || !session || sending) return;

    setThread((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    speech.reset();
    setSending(true);

    try {
      const res = await fetch('/api/v2/roleplay/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, user_text: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'turn_failed');

      setThread((prev) => {
        const next = [...prev];
        if (data.correction) next.push({ role: 'fix', text: data.correction.right_excerpt, correction: data.correction });
        if (data.praise_pt) next.push({ role: 'fix', text: data.praise_pt, praise: true });
        next.push({ role: 'ai', text: data.ai_reply_en });
        return next;
      });

      setSession((prev) => ({ ...prev, turns_done: data.turns_done }));

      if (data.mission_complete) {
        setMissionComplete(true);
        setSummaryFixes(data.accumulated_fixes || []);
      }
    } catch {
      // Mantém a resposta digitada de volta no campo (não perde o que o
      // aluno escreveu) e mostra um aviso neutro, não uma fala do
      // personagem — evitar fingir que ele "respondeu" com um erro.
      setInput(text);
      setThread((prev) => [...prev, { role: 'system', text: 'Não consegui enviar agora — sua resposta não foi perdida, tente de novo.' }]);
    }
    setSending(false);
  };

  const finishAndExit = async () => {
    setFinishing(true);
    const durationSeconds = Math.round((Date.now() - statsRef.current.startedAt) / 1000);
    try {
      await fetch('/api/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'roleplay', mode: 'speaking', duration_seconds: durationSeconds }),
      });
    } catch {
      // segue mesmo se falhar — não bloqueia a saída
    }
    router.push('/v2/mapa');
    router.refresh();
  };

  if (starting) {
    return (
      <div className="v2-bg" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-ui-v2)' }}>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>preparando a conversa…</p>
      </div>
    );
  }

  if (startError || !session) {
    return (
      <div className="v2-bg" style={{ minHeight: '100dvh', padding: '20px 20px 40px', fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <BackHeader title="Roleplay" />
          <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>Não consegui começar o roleplay agora. Tenta de novo em um instante.</p>
        </div>
      </div>
    );
  }

  if (missionComplete) {
    const corrections = summaryFixes.filter((m) => !m.praise);
    const praises = summaryFixes.filter((m) => m.praise);
    return (
      <div className="v2-bg" style={{ minHeight: '100dvh', padding: '32px 20px 40px', fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 26, margin: '0 auto 12px' }}>✓</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Missão cumprida</h1>
            <p style={{ margin: '6px 0 0', color: 'var(--ink-soft)', fontSize: 14 }}>{session.turns_done} turnos com {session.character?.name}</p>
          </div>

          {praises.length > 0 && (
            <div className="v2-card">
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>pontos fortes</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {praises.map((p, i) => <p key={i} style={{ margin: 0, fontSize: 14 }}>✓ {p.text}</p>)}
              </div>
            </div>
          )}

          {corrections.length > 0 && (
            <div className="v2-card">
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>correções da conversa</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                {corrections.map((c, i) => (
                  <div key={i}>
                    <p style={{ margin: 0, fontSize: 15 }}>
                      <span style={{ color: 'var(--red)', textDecoration: 'line-through' }}>{c.correction?.wrong_excerpt}</span>
                      {' → '}
                      <strong style={{ color: 'var(--green-dark)' }}>{c.correction?.right_excerpt}</strong>
                    </p>
                    {c.correction?.explain_pt && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{c.correction.explain_pt}</p>}
                  </div>
                ))}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>Todas já entraram na sua memória espaçada.</p>
            </div>
          )}

          {corrections.length === 0 && praises.length === 0 && (
            <div className="v2-card">
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>Conversa limpa, sem erros pra corrigir. 👏</p>
            </div>
          )}

          <button type="button" onClick={finishAndExit} disabled={finishing} className="v2-card-dark" style={{ border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            {finishing ? 'Salvando…' : 'Voltar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="v2-bg" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-ui-v2)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', width: '100%', padding: '20px 20px 0', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <BackHeader title={scenarioTitle || 'Roleplay'} />
          <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 12, color: 'var(--ink-soft)' }}>{session.turns_done}/{session.turns_target}</span>
        </div>

        <div className="v2-card" style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>missão</span>
          <p style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 600 }}>{session.mission_pt}</p>
        </div>

        <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 14 }}>
          {thread.map((m, i) => {
            if (m.role === 'system') {
              return (
                <div key={i} style={{ alignSelf: 'center', maxWidth: '90%', fontSize: 12.5, color: 'var(--ink-soft)', textAlign: 'center', padding: '6px 12px' }}>
                  {m.text}
                </div>
              );
            }
            if (m.role === 'fix') {
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: 'flex-end', maxWidth: '85%', borderRadius: 14, padding: '10px 14px', fontSize: 13,
                    background: m.praise ? 'var(--green-soft)' : 'var(--v2-card-bg)',
                    color: m.praise ? 'var(--green-dark)' : 'var(--v2-card-fg)',
                    border: m.praise ? 'none' : '1px solid var(--red)',
                  }}
                >
                  {m.praise ? (
                    <>✓ Essa frase entrou na sua memória espaçada — {m.text}</>
                  ) : (
                    <>
                      <span style={{ textDecoration: 'line-through', color: 'var(--red)' }}>{m.correction?.wrong_excerpt}</span>
                      {' → '}
                      <strong style={{ color: 'var(--green-dark)' }}>{m.correction?.right_excerpt}</strong>
                      {m.correction?.explain_pt && <p style={{ margin: '4px 0 0', opacity: 0.85 }}>{m.correction.explain_pt}</p>}
                    </>
                  )}
                </div>
              );
            }
            const isAi = m.role === 'ai';
            return (
              <div key={i} style={{ alignSelf: isAi ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
                {isAi && i === 0 && (
                  <p style={{ margin: '0 0 3px 4px', fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700 }}>{session.character?.name}</p>
                )}
                <div
                  style={{
                    borderRadius: 16, padding: '10px 14px', fontSize: 15, lineHeight: 1.4,
                    background: isAi ? 'var(--v2-card-bg)' : 'var(--ink)',
                    color: isAi ? 'var(--v2-card-fg)' : '#fff',
                  }}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
          {sending && (
            <div style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--ink-soft)', padding: '0 4px' }}>{session.character?.name} está digitando…</div>
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', background: 'var(--v2-card-bg)', padding: 14 }}>
        <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="responda em inglês…"
            style={{ flex: 1, minHeight: 42, maxHeight: 100, border: '1.5px solid var(--line)', borderRadius: 14, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'none', background: 'var(--v2-card-bg)', color: 'var(--v2-card-fg)' }}
          />
          {speech.supported && (
            <button
              type="button"
              onClick={() => { speech.toggle(); }}
              aria-label={speech.recording ? 'Parar gravação' : 'Ditar por voz'}
              style={{ width: 42, height: 42, flexShrink: 0, borderRadius: '50%', border: 'none', cursor: 'pointer', background: speech.recording ? 'var(--red)' : 'var(--green)' }}
            >
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#fff' }} />
            </button>
          )}
          <button
            type="button"
            onClick={send}
            disabled={sending || !answerText.trim()}
            className="v2-card-dark"
            style={{ height: 42, padding: '0 16px', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

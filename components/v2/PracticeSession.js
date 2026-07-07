'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeechRecognition } from '../../lib/useSpeechRecognition';
import { speak } from '../../lib/tts';
import { BackHeader } from './BackHeader';

// Compartilhado por /praticar/writing, /praticar/speaking e /pontos-fracos
// (Etapa 9) — só muda a entrada (texto vs voz) e, no treino direcionado,
// cada item da fila pode trazer seu próprio "mode" (fila mesclada). Fila =
// revisões due primeiro, depois exercícios novos (montada no server, ver
// app/v2/praticar/*/page.js e app/v2/pontos-fracos/page.js).
export function PracticeSession({ mode, initialQueue, profile, otherModeHref, otherModeLabel, headerTitle, headerExtra, sessionKind = 'daily' }) {
  const router = useRouter();
  const accent = profile?.voice_accent || 'us';
  const rate = profile?.audio_speed || 1.0;
  const lang = accent === 'uk' ? 'en-GB' : 'en-US';
  const speech = useSpeechRecognition({ lang });

  const [queueIndex, setQueueIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showModel, setShowModel] = useState(false);

  const [finished, setFinished] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);

  const statsRef = useRef({ correct: 0, total: 0, newPhrases: [], startedAt: Date.now() });
  const deferredResultsRef = useRef([]);
  const [deferredIndex, setDeferredIndex] = useState(null);
  const [deferredTotal, setDeferredTotal] = useState(0);

  const queue = initialQueue || [];
  const totalItems = queue.length;
  const activeItem = deferredIndex !== null ? null : queue[queueIndex];
  const timingEnd = profile?.correction_timing === 'end_of_exercise' || profile?.correction_timing === 'end';

  const itemMode = activeItem?.mode || mode;
  const isSpeaking = itemMode === 'speaking';

  const answerText = isSpeaking ? speech.transcript || draft : draft;

  const resetInputs = () => {
    setDraft('');
    speech.reset();
    setError('');
    setResult(null);
    setShowModel(false);
  };

  const finishSession = async (extraDurationSeconds = 0) => {
    const stats = statsRef.current;
    const durationSeconds = Math.round((Date.now() - stats.startedAt) / 1000) + extraDurationSeconds;
    try {
      const res = await fetch('/api/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: sessionKind, mode, duration_seconds: durationSeconds, items_total: stats.total, items_correct: stats.correct }),
      });
      const data = await res.json();
      setSessionSummary({ ...data, correct: stats.correct, total: stats.total, newPhrases: stats.newPhrases });
    } catch {
      setSessionSummary({ streak_count: null, week_days_done: null, weekly_goal: null, shield_earned: false, correct: stats.correct, total: stats.total, newPhrases: stats.newPhrases });
    }
    setFinished(true);
  };

  const showDeferredResult = (idx) => {
    const item = deferredResultsRef.current[idx];
    if (!item) {
      finishSession();
      return;
    }
    setResult(item);
    setDeferredIndex(idx);
  };

  const advance = () => {
    resetInputs();

    if (deferredIndex !== null) {
      const nextIdx = deferredIndex + 1;
      if (nextIdx < deferredResultsRef.current.length) {
        showDeferredResult(nextIdx);
      } else {
        finishSession();
      }
      return;
    }

    const nextIndex = queueIndex + 1;
    if (nextIndex < totalItems) {
      setQueueIndex(nextIndex);
      return;
    }

    if (timingEnd && deferredResultsRef.current.length > 0) {
      setDeferredTotal(deferredResultsRef.current.length);
      showDeferredResult(0);
      return;
    }

    finishSession();
  };

  const submitAnswer = async () => {
    const text = answerText.trim();
    if (!text) {
      setError(isSpeaking ? 'Fale ou digite sua resposta primeiro.' : 'Escreva sua resposta primeiro.');
      return;
    }
    if (!activeItem) return;

    setLoading(true);
    setError('');

    const payload = {
      mode: itemMode,
      prompt_pt: activeItem.promptPt,
      expected_focus: activeItem.expectedFocus,
      user_answer: text,
      phrase_id: activeItem.kind === 'review' ? activeItem.phraseId : null,
      skill_tags: activeItem.skillTags || [],
    };

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'evaluation_failed');

      const stats = statsRef.current;
      stats.total += 1;
      if (data.evaluation.result === 'correct') stats.correct += 1;
      if ((activeItem.kind === 'new' || activeItem.kind === 'weak') && data.reviewItem) {
        stats.newPhrases.push(data.reviewItem.content?.forma_natural || data.reviewItem.pattern);
      }

      const resultPayload = { ...data.evaluation, original: text };

      if (timingEnd) {
        deferredResultsRef.current = [...deferredResultsRef.current, resultPayload];
        advance();
      } else {
        setResult(resultPayload);
      }
    } catch {
      setError('Sem conexão com o servidor agora. Tente de novo.');
    }
    setLoading(false);
  };

  const useModelPhrase = async () => {
    if (activeItem?.kind !== 'review') return;
    try {
      await fetch('/api/review/defer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase_id: activeItem.phraseId }),
      });
    } catch {
      // segue mesmo se falhar — não é uma tentativa real, não crítico
    }
    advance();
  };

  if (finished && sessionSummary) {
    return <SessionCompleteScreen mode={mode} summary={sessionSummary} otherModeHref={otherModeHref} otherModeLabel={otherModeLabel} />;
  }

  if (!activeItem && result) {
    // resultado de item deferido sendo revisado no final
  } else if (!activeItem) {
    finishSession();
    return null;
  }

  const item = activeItem || queue[queueIndex];
  const progressCurrent = deferredIndex !== null ? deferredIndex + 1 : queueIndex + 1;
  const progressTotal = deferredIndex !== null ? deferredTotal : totalItems;

  return (
    <div className="v2-bg" style={{ minHeight: '100dvh', padding: '20px 20px 40px', fontFamily: 'var(--font-ui-v2)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <BackHeader title={headerTitle || (isSpeaking ? 'Speaking' : 'Writing')} />
          <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 12, color: 'var(--ink-soft)' }}>{progressCurrent}/{progressTotal}</span>
        </div>
        {headerExtra}
        <div style={{ height: 4, borderRadius: 999, background: 'var(--line)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', background: 'var(--green)', width: `${(progressCurrent / Math.max(1, progressTotal)) * 100}%`, transition: 'width .25s ease' }} />
        </div>

        {!result ? (
          <>
            {item.kind === 'review' ? (
              <div className="v2-card" style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>revisão · {item.categoria}</span>
                <p style={{ margin: '8px 0 4px', fontSize: 14, color: 'var(--ink-soft)' }}>Dica: {item.tip}</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{item.promptPt}</p>
              </div>
            ) : (
              <div className="v2-card" style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {item.kind === 'weak' ? `foco · ${item.categoria}` : 'cenário'}
                </span>
                <p style={{ margin: '8px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{item.promptPt}</p>
                {item.personalHintPt && (
                  <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic' }}>{item.personalHintPt}</p>
                )}
              </div>
            )}

            {isSpeaking ? (
              <div style={{ textAlign: 'center', margin: '28px 0 16px' }}>
                {speech.supported ? (
                  <>
                    <button
                      type="button"
                      onClick={speech.toggle}
                      aria-label={speech.recording ? 'Parar gravação' : 'Gravar'}
                      style={{
                        width: 84, height: 84, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: speech.recording ? 'var(--red)' : 'var(--green)',
                      }}
                    >
                      <span style={{ display: 'inline-block', width: 26, height: 26, borderRadius: 8, background: '#fff' }} />
                    </button>
                    <p style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-soft)', letterSpacing: '0.08em' }}>
                      {speech.recording ? 'toque para parar' : 'toque para falar'}
                    </p>
                    {speech.transcript && <p style={{ marginTop: 10, fontSize: 15 }}>{speech.transcript}</p>}
                  </>
                ) : (
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8 }}>
                      Seu navegador não suporta reconhecimento de voz — digite sua resposta.
                    </p>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="digite o que você diria…"
                      style={{ width: '100%', minHeight: 100, border: '1.5px solid var(--ink)', borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'inherit' }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="escreva em inglês…"
                  style={{ width: '100%', minHeight: 120, border: '1.5px solid var(--ink)', borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'inherit', resize: 'vertical' }}
                />
                {speech.supported && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!speech.recording) speech.reset();
                        speech.toggle();
                        if (speech.transcript) setDraft(speech.transcript);
                      }}
                      aria-label="Ditar por voz"
                      style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', background: speech.recording ? 'var(--red)' : 'var(--green)' }}
                    >
                      <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 4, background: '#fff' }} />
                    </button>
                  </div>
                )}
                {speech.transcript && draft !== speech.transcript && (
                  <button type="button" onClick={() => setDraft(speech.transcript)} style={{ fontSize: 12, color: 'var(--green-dark)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginBottom: 8 }}>
                    usar: &quot;{speech.transcript}&quot;
                  </button>
                )}
              </>
            )}

            {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: '4px 0' }}>{error}</p>}

            <button
              type="button"
              onClick={submitAnswer}
              disabled={loading || !answerText.trim()}
              className="v2-card-dark"
              style={{ width: '100%', border: 'none', textAlign: 'center', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 8 }}
            >
              {loading ? 'Avaliando…' : 'Enviar resposta'}
            </button>

            {item.kind === 'review' && (
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                {!showModel ? (
                  <button type="button" onClick={() => setShowModel(true)} style={{ fontSize: 12.5, color: 'var(--green-dark)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                    travou? ver uma frase-modelo
                  </button>
                ) : (
                  <div className="v2-card" style={{ textAlign: 'left', marginTop: 10 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600 }}>{item.formaNatural}</p>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--ink-soft)' }}>(conta como revisão, não como acerto)</p>
                    <button type="button" onClick={useModelPhrase} style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-dark)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      continuar →
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <FeedbackPanel result={result} accent={accent} rate={rate} onNext={advance} />
        )}
      </div>
    </div>
  );
}

function FeedbackPanel({ result, accent, rate, onNext }) {
  const correct = result.result === 'correct';
  return (
    <div>
      <div className="v2-card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#fff',
            background: correct ? 'var(--green)' : 'var(--red)',
          }}>
            {correct ? '✓' : '!'}
          </span>
          <strong style={{ fontSize: 15 }}>{correct ? 'Muito bem!' : 'Quase lá'}</strong>
        </div>

        {correct ? (
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--green-dark)' }}>{result.corrected_en || result.natural_phrase_en}</p>
        ) : (
          <p style={{ margin: 0, fontSize: 16 }}>
            <span style={{ color: 'var(--red)', textDecoration: 'line-through' }}>{result.wrong_excerpt}</span>
            {' → '}
            <strong style={{ color: 'var(--green-dark)' }}>{result.right_excerpt}</strong>
          </p>
        )}

        {result.explain_pt && <p style={{ margin: '10px 0 0', fontSize: 13.5, color: 'var(--ink-soft)' }}>{result.explain_pt}</p>}
        {result.tip_pt && (
          <span style={{ display: 'inline-block', marginTop: 10, fontFamily: 'var(--font-mono-v2)', fontSize: 11, background: 'var(--green-soft)', color: 'var(--green-dark)', borderRadius: 999, padding: '4px 10px' }}>
            {result.tip_pt}
          </span>
        )}

        {!correct && (
          <button
            type="button"
            onClick={() => speak(result.natural_phrase_en, { accent, rate })}
            style={{ display: 'block', marginTop: 12, fontSize: 12.5, color: 'var(--green-dark)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
          >
            ouvir a frase certa
          </button>
        )}
      </div>

      <button type="button" onClick={onNext} className="v2-card-dark" style={{ width: '100%', border: 'none', textAlign: 'center', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        {correct ? 'Próxima →' : 'Entendi, próxima →'}
      </button>
    </div>
  );
}

function SessionCompleteScreen({ mode, summary, otherModeHref, otherModeLabel }) {
  const router = useRouter();
  return (
    <div className="v2-bg" style={{ minHeight: '100dvh', padding: '32px 20px 40px', fontFamily: 'var(--font-ui-v2)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 26, margin: '0 auto 12px' }}>✓</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Sessão concluída</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--ink-soft)', fontSize: 14 }}>{summary.correct}/{summary.total} corretas</p>
        </div>

        {summary.newPhrases?.length > 0 && (
          <div className="v2-card">
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              frases novas na memória espaçada
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {summary.newPhrases.map((p, idx) => (
                <p key={idx} style={{ margin: 0, fontSize: 14 }}>{p}</p>
              ))}
            </div>
          </div>
        )}

        {typeof summary.streak_count === 'number' && (
          <div className="v2-card-dark">
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>streak</span>
            <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800 }}>{summary.streak_count} {summary.streak_count === 1 ? 'dia' : 'dias'}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {Array.from({ length: summary.weekly_goal || 5 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, height: 8, borderRadius: 999, background: i < (summary.week_days_done || 0) ? 'var(--green)' : 'rgba(255,255,255,0.15)',
                    transition: 'background .3s ease',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {summary.shield_earned && (
          <div style={{ background: 'var(--green-soft)', borderRadius: 16, padding: 14 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--green-dark)', fontWeight: 600 }}>
              🛡 Você ganhou um escudo: 1 falta por semana não zera sua sequência.
            </p>
          </div>
        )}

        <button type="button" onClick={() => { router.push('/v2'); router.refresh(); }} className="v2-card-dark" style={{ border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Voltar para Hoje
        </button>
        {otherModeHref && (
          <button
            type="button"
            onClick={() => router.push(otherModeHref)}
            className="v2-card"
            style={{ border: '1px solid var(--line)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'var(--ink)' }}
          >
            Fazer também {otherModeLabel}
          </button>
        )}
      </div>
    </div>
  );
}

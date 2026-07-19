'use client';

import { useRouter } from 'next/navigation';
import { usePracticeSession } from '../../lib/usePracticeSession';
import { speak } from '../../lib/tts';
import { BackHeader } from './BackHeader';

// Componente único de prática (escrita/fala), compartilhado por
// /praticar/writing, /praticar/speaking e /pontos-fracos — responsivo via
// CSS (.v2-practice-cols vira split-view em telas largas, empilha no
// mobile), sem duas implementações a manter em sincronia. Fila = revisões
// due primeiro, depois exercícios novos (montada no server, ver
// app/v2/praticar/*/page.js e app/v2/pontos-fracos/page.js).
export function PracticeSession({ mode, initialQueue, profile, otherModeHref, otherModeLabel, headerTitle, headerExtra, sessionKind = 'daily', homeHref = '/v2' }) {
  const s = usePracticeSession({ mode, initialQueue, profile, sessionKind });

  if (s.finished && s.sessionSummary) {
    return <SessionCompleteScreen mode={mode} summary={s.sessionSummary} otherModeHref={otherModeHref} otherModeLabel={otherModeLabel} homeHref={homeHref} />;
  }

  if (!s.activeItem && s.result) {
    // resultado de item deferido sendo revisado no final — segue renderizando abaixo
  } else if (!s.activeItem) {
    s.finishSession();
    return null;
  }

  const item = s.item;
  const isSpeaking = s.isSpeaking;

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!s.loading && s.answerText.trim()) s.submitAnswer();
    }
  };

  return (
    <div className="v2-bg v2-practice-page">
      <div className="v2-practice-inner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <BackHeader title={headerTitle || (isSpeaking ? 'Speaking' : 'Writing')} />
          <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 12, color: 'var(--ink-soft)' }}>{s.progressCurrent}/{s.progressTotal}</span>
        </div>
        {headerExtra}
        <div style={{ height: 4, borderRadius: 999, background: 'var(--line)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', background: 'var(--green)', width: `${(s.progressCurrent / Math.max(1, s.progressTotal)) * 100}%`, transition: 'width .25s ease' }} />
        </div>

        {!s.result ? (
          <div className="v2-practice-cols">
            {/* Contexto: prompt do cenário/revisão + frase-modelo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {item.kind === 'review' ? (
                <div className="v2-card">
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>revisão · {item.categoria}</span>
                  <p style={{ margin: '10px 0 4px', fontSize: 14, color: 'var(--ink-soft)' }}>Dica: {item.tip}</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{item.promptPt}</p>
                </div>
              ) : (
                <div className="v2-card">
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {item.kind === 'weak' ? `foco · ${item.categoria}` : 'cenário'}
                  </span>
                  <p style={{ margin: '10px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{item.promptPt}</p>
                  {item.personalHintPt && (
                    s.showHint ? (
                      <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>Dica: {item.personalHintPt}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => s.setShowHint(true)}
                        style={{ marginTop: 10, fontSize: 12.5, color: 'var(--green-dark)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        💡 ver dica
                      </button>
                    )
                  )}
                </div>
              )}

              {item.formaNatural && (
                <div>
                  {!s.showModel ? (
                    <button type="button" onClick={() => s.setShowModel(true)} style={{ fontSize: 12.5, color: 'var(--green-dark)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                      travou? ver uma frase-modelo
                    </button>
                  ) : (
                    <div className="v2-card">
                      <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600 }}>{item.formaNatural}</p>
                      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--ink-soft)' }}>
                        {item.kind === 'review' ? '(conta como revisão, não como acerto)' : '(não conta como acerto — pula para a próxima)'}
                      </p>
                      <button type="button" onClick={s.useModelPhrase} style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-dark)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        continuar →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resposta: mic/texto, erro, envio */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isSpeaking && s.speech.supported && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    onClick={s.speech.toggle}
                    aria-label={s.speech.recording ? 'Parar gravação' : 'Gravar'}
                    style={{
                      width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
                      background: s.speech.recording ? 'var(--red)' : 'var(--green)',
                    }}
                  >
                    <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 6, background: '#fff' }} />
                  </button>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                    {s.speech.recording ? 'Ouvindo… toque para parar.' : 'Toque no microfone e fale em inglês, ou digite abaixo.'}
                  </p>
                </div>
              )}
              {isSpeaking && !s.speech.supported && (
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0 }}>
                  Seu navegador não suporta reconhecimento de voz — digite sua resposta abaixo.
                </p>
              )}

              <textarea
                value={isSpeaking ? (s.speech.transcript || s.draft) : s.draft}
                onChange={(e) => { s.setDraft(e.target.value); if (isSpeaking) s.speech.setTranscript(e.target.value); }}
                onKeyDown={handleKeyDown}
                placeholder={isSpeaking ? 'sua fala aparece aqui — ou digite…' : 'escreva em inglês…'}
                className="web-textarea"
                autoFocus
              />

              {s.error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{s.error}</p>}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <span className="web-kbd-hint desktop-only">
                  <kbd>{typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'}</kbd> + <kbd>Enter</kbd> para enviar
                </span>
                <button
                  type="button"
                  onClick={s.submitAnswer}
                  disabled={s.loading || !s.answerText.trim()}
                  className="v2-card-dark"
                  style={{ border: 'none', textAlign: 'center', fontWeight: 700, fontSize: 15, cursor: 'pointer', padding: '12px 24px', flex: '1 1 auto' }}
                >
                  {s.loading ? 'Avaliando…' : 'Enviar resposta'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <FeedbackPanel result={s.result} accent={s.accent} rate={s.rate} onNext={s.advance} />
        )}
      </div>
    </div>
  );
}

function FeedbackPanel({ result, accent, rate, onNext }) {
  const correct = result.result === 'correct';
  return (
    <div style={{ maxWidth: 640 }}>
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

function SessionCompleteScreen({ mode, summary, otherModeHref, otherModeLabel, homeHref }) {
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

        <button type="button" onClick={() => { router.push(homeHref); router.refresh(); }} className="v2-card-dark" style={{ border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
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

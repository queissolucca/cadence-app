'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRACKS } from '../lib/tracks';

// Onboarding reduzido a 2 perguntas (uma por habilidade) — só um norte
// inicial, não uma avaliação precisa. O nível real se ajusta com uso, via
// SRS/desempenho ao longo do tempo. Duplicado (não importado) de
// lib/diagnostic.js de propósito: aquele arquivo instancia o SDK da
// Anthropic e não deve entrar no bundle do cliente.
const WRITING_TASK = {
  label: 'ANTES DE COMEÇAR',
  context: 'Conte rapidinho: o que você fez ontem?',
  askPt: 'Escreva 1-2 frases curtas em inglês.',
};

const SPEAKING_OPTIONS = [
  { id: 'a', label: 'trava e não sai nada' },
  { id: 'b', label: 'sai mas devagar e travado' },
  { id: 'c', label: 'sai mas com insegurança' },
  { id: 'd', label: 'sai relativamente bem, só quero polir' },
];

// Cadência e trilha ficam com um padrão sensato aplicado automaticamente —
// dá pra ajustar depois na aba Progresso. Menos uma etapa manual no meio do
// onboarding (e uma rota a menos que pode travar o fluxo).
const DEFAULT_CADENCE = 5;
const DEFAULT_TRACK = TRACKS[0].id;

export default function Diagnostic() {
  const router = useRouter();
  const [phase, setPhase] = useState('intro'); // intro | writing | speaking | loading | reveal
  const [writingText, setWritingText] = useState('');
  const [reveal, setReveal] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const startDiagnostic = () => {
    setPhase('writing');
  };

  const goToSpeaking = () => {
    if (!writingText.trim()) {
      setError('Escreva sua resposta antes de continuar.');
      return;
    }
    setError('');
    setPhase('speaking');
  };

  const pickSpeaking = (choiceId) => {
    submitDiagnostic(writingText.trim(), choiceId);
  };

  const submitDiagnostic = async (finalWritingText, speakingChoice) => {
    setPhase('loading');
    try {
      const res = await fetch('/api/diagnostic/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writingText: finalWritingText, speakingChoice }),
      });
      const data = await res.json();
      setReveal(data);
      setPhase('reveal');
    } catch {
      setReveal({
        writing: { precisao: 50, naturalidade: 50, vocabulario: 50, fluencia: 50, cefr: 'B1', resumo: 'Não conseguimos avaliar agora — nível inicial padrão aplicado.' },
        speaking: { precisao: 50, naturalidade: 50, vocabulario: 50, fluencia: 50, cefr: 'B1', resumo: 'Não conseguimos avaliar agora — nível inicial padrão aplicado.' },
        diagnostico: 'Não conseguimos analisar agora — começamos com um nível padrão e ajustamos com o seu uso.',
        ledgerItems: [],
      });
      setPhase('reveal');
    }
  };

  const finishSetup = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyCadence: DEFAULT_CADENCE, track: DEFAULT_TRACK }),
      });
      // fetch não lança erro em respostas 4xx/5xx — precisa checar res.ok,
      // senão a gente segue pro refresh achando que salvou e trava aqui
      // pra sempre esperando o diagnóstico virar "completo".
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'setup_failed');
      }
      router.refresh();
      // router.refresh() não devolve uma promise que resolve quando a troca
      // de tela acontece — se por qualquer motivo o servidor não confirmar
      // diagnostic_completed=true (hiccup de rede, replicação atrasada),
      // essa tela ficaria presa em "Preparando seu cadence…" pra sempre. Se
      // ainda estivermos montados depois de alguns segundos, destrava e avisa.
      setTimeout(() => {
        setSaving(false);
        setError('Isso está demorando mais que o esperado. Tenta de novo.');
      }, 6000);
    } catch (err) {
      setError(`Não consegui salvar agora (${err.message}). Tenta de novo.`);
      setSaving(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="app-card">
        <div className="screen" style={{ gap: 18 }}>
          {phase === 'intro' && (
            <>
              <div>
                <div className="logo">cadence</div>
                <p className="subtitle">você já sabe inglês, hora de aprender de vez.</p>
              </div>
              <div className="login-hero">
                <h1>Antes de começar, um norte rápido.</h1>
                <p>
                  Duas perguntas, menos de 2 minutos. Isso não é uma prova — é só o ponto de partida.
                  Seu nível de verdade vai se ajustar sozinho conforme você pratica.
                </p>
              </div>
              <button className="submit-btn ready" onClick={startDiagnostic}>Começar</button>
            </>
          )}

          {phase === 'writing' && (
            <>
              <div className="sub-header">
                <span className="sub-label">ESCRITA</span>
                <span className="sub-count">1/2</span>
              </div>
              <div className="session-progress-track">
                <div className="session-progress-fill" style={{ width: '50%' }} />
              </div>

              <div className="scenario-box">
                <h2>{WRITING_TASK.label}</h2>
                <p>{WRITING_TASK.context}</p>
                <small>{WRITING_TASK.askPt}</small>
              </div>

              <div className="input-wrap">
                <textarea
                  className="input-area"
                  placeholder="Escreva em inglês…"
                  value={writingText}
                  onChange={(e) => setWritingText(e.target.value)}
                />
                <div className="input-footer">
                  <span className="char-count">{writingText.length} caracteres</span>
                </div>
              </div>
              {error && <div className="error-box">{error}</div>}
              <button className={`submit-btn ${writingText.trim() ? 'ready' : ''}`} onClick={goToSpeaking}>
                Próxima pergunta
              </button>
            </>
          )}

          {phase === 'speaking' && (
            <>
              <div className="sub-header">
                <span className="sub-label">FALA</span>
                <span className="sub-count">2/2</span>
              </div>
              <div className="session-progress-track">
                <div className="session-progress-fill" style={{ width: '100%' }} />
              </div>

              <div className="scenario-box">
                <h2>NA HORA H</h2>
                <p>Quando você precisa falar inglês em tempo real (call, conversa), o que mais acontece?</p>
              </div>

              <div className="input-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SPEAKING_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    className="submit-btn"
                    style={{ textAlign: 'left' }}
                    onClick={() => pickSpeaking(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {error && <div className="error-box">{error}</div>}
            </>
          )}

          {phase === 'loading' && (
            <div className="scenario-box scenario-loading" style={{ minHeight: 300 }}>
              <p>Analisando suas respostas…</p>
            </div>
          )}

          {phase === 'reveal' && reveal && (
            <>
              <div>
                <div className="logo">cadence</div>
                <p className="subtitle">Seu norte inicial</p>
              </div>

              {reveal.diagnostico && (
                <div className="insight-box">
                  <p style={{ margin: 0 }}>{reveal.diagnostico}</p>
                </div>
              )}

              <div className="chart-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0 }}>Escrita</h4>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '3px 9px', borderRadius: 20 }}>{reveal.writing.cefr}</span>
                </div>
                <p style={{ marginTop: 6, fontSize: 13, color: '#575b41' }}>{reveal.writing.resumo}</p>
                {['precisao', 'naturalidade', 'vocabulario', 'fluencia'].map((axis) => (
                  <div className="axis-row" key={axis} style={{ marginBottom: 8 }}>
                    <div className="axis-row-head"><span>{axis}</span><span>{reveal.writing[axis]}</span></div>
                    <div className="axis-track"><div className="axis-fill" style={{ width: `${reveal.writing[axis]}%` }} /></div>
                  </div>
                ))}
              </div>

              <div className="chart-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0 }}>Fala</h4>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '3px 9px', borderRadius: 20 }}>{reveal.speaking.cefr}</span>
                </div>
                <p style={{ marginTop: 6, fontSize: 13, color: '#575b41' }}>{reveal.speaking.resumo}</p>
                {['precisao', 'naturalidade', 'vocabulario', 'fluencia'].map((axis) => (
                  <div className="axis-row" key={axis} style={{ marginBottom: 8 }}>
                    <div className="axis-row-head"><span>{axis}</span><span>{reveal.speaking[axis]}</span></div>
                    <div className="axis-track"><div className="axis-fill" style={{ width: `${reveal.speaking[axis]}%` }} /></div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 12, color: '#a3a68f', margin: 0 }}>
                Começamos com {DEFAULT_CADENCE}x por semana na trilha {TRACKS[0].label} — dá pra ajustar depois em Progresso.
              </p>
              {error && <div className="error-box">{error}</div>}
              <button className="submit-btn ready" onClick={finishSetup} disabled={saving}>
                {saving ? 'Preparando seu cadence…' : 'Começar a praticar'}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

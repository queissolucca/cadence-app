'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRACKS } from '../lib/tracks';

const DIAGNOSTIC_TASKS = [
  { id: 'diag_w1', skill: 'writing', label: 'MENSAGEM NO SLACK', context: 'Um colega te chamou no Slack perguntando se você pode revisar o código dele hoje.', askPt: 'Responda de forma informal, dizendo que sim, mas só à tarde.' },
  { id: 'diag_w2', skill: 'writing', label: 'E-MAIL PEDINDO PRAZO', context: 'Você não vai conseguir terminar uma entrega no prazo combinado.', askPt: 'Escreva um email pedindo mais alguns dias.' },
  { id: 'diag_w3', skill: 'writing', label: 'ARGUMENTAR UMA OPINIÃO', context: 'Seu time está decidindo entre duas ferramentas para o projeto.', askPt: 'Escreva 4-5 frases defendendo sua opinião sobre qual usar.' },
  { id: 'diag_s1', skill: 'speaking', label: 'SE APRESENTAR', context: 'Você está numa reunião com pessoas que não te conhecem.', askPt: 'Se apresente em 30 segundos: quem você é e o que faz.' },
  { id: 'diag_s2', skill: 'speaking', label: 'SITUAÇÃO INESPERADA', context: 'Seu voo foi cancelado em cima da hora.', askPt: 'Negocie com a atendente um novo voo.' },
];

// Cadência e trilha ficam com um padrão sensato aplicado automaticamente —
// dá pra ajustar depois na aba Progresso. Menos uma etapa manual no meio do
// onboarding (e uma rota a menos que pode travar o fluxo).
const DEFAULT_CADENCE = 5;
const DEFAULT_TRACK = TRACKS[0].id;

export default function Diagnostic() {
  const router = useRouter();
  const [phase, setPhase] = useState('intro'); // intro | tasks | loading | reveal
  const [taskIndex, setTaskIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [draft, setDraft] = useState('');
  const [reveal, setReveal] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const currentTask = DIAGNOSTIC_TASKS[taskIndex];

  const startDiagnostic = () => {
    setPhase('tasks');
    setTaskIndex(0);
    setDraft('');
  };

  const nextTask = () => {
    const text = draft.trim();
    if (!text) {
      setError('Escreva ou fale sua resposta antes de continuar.');
      return;
    }
    setError('');
    const nextAnswers = { ...answers, [currentTask.id]: text };
    setAnswers(nextAnswers);
    setDraft('');

    if (taskIndex + 1 < DIAGNOSTIC_TASKS.length) {
      setTaskIndex(taskIndex + 1);
      return;
    }

    submitDiagnostic(nextAnswers);
  };

  const submitDiagnostic = async (finalAnswers) => {
    setPhase('loading');
    try {
      const res = await fetch('/api/diagnostic/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const data = await res.json();
      setReveal(data);
      setPhase('reveal');
    } catch {
      setReveal({
        writing: { precisao: 50, naturalidade: 50, vocabulario: 50, fluencia: 50, resumo: 'Não conseguimos avaliar agora — nível inicial padrão aplicado.' },
        speaking: { precisao: 50, naturalidade: 50, vocabulario: 50, fluencia: 50, resumo: 'Não conseguimos avaliar agora — nível inicial padrão aplicado.' },
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
    } catch {
      setError('Não consegui salvar agora. Tenta de novo.');
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
                <p className="subtitle">inglês, pouco e sempre</p>
              </div>
              <div className="login-hero">
                <h1>Antes de começar, medimos suas lacunas de verdade.</h1>
                <p>
                  Cinco tarefas curtas de escrita e fala — 6 a 8 minutos. Cada sessão futura ataca as
                  <em> suas</em> lacunas, não as de todo mundo, com repetição espaçada até virar automático.
                </p>
              </div>
              <button className="submit-btn ready" onClick={startDiagnostic}>Começar diagnóstico</button>
            </>
          )}

          {phase === 'tasks' && currentTask && (
            <>
              <div className="sub-header">
                <span className="sub-label">{currentTask.skill === 'speaking' ? 'FALA' : 'ESCRITA'}</span>
                <span className="sub-count">{taskIndex + 1}/{DIAGNOSTIC_TASKS.length}</span>
              </div>
              <div className="session-progress-track">
                <div className="session-progress-fill" style={{ width: `${((taskIndex + 1) / DIAGNOSTIC_TASKS.length) * 100}%` }} />
              </div>

              <div className="scenario-box">
                <h2>{currentTask.label}</h2>
                <p>{currentTask.context}</p>
                <small>{currentTask.askPt}</small>
              </div>

              <div className="input-wrap">
                <textarea
                  className="input-area"
                  placeholder={currentTask.skill === 'speaking' ? 'Digite o que você diria (ou fale e transcreva)…' : 'Escreva em inglês…'}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="input-footer">
                  <span className="char-count">{draft.length} caracteres</span>
                </div>
              </div>
              {error && <div className="error-box">{error}</div>}
              <button className={`submit-btn ${draft.trim() ? 'ready' : ''}`} onClick={nextTask}>
                {taskIndex + 1 < DIAGNOSTIC_TASKS.length ? 'Próxima tarefa' : 'Ver meu Mapa de Lacunas'}
              </button>
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
                <p className="subtitle">Seu Mapa de Lacunas</p>
              </div>

              <div className="chart-card">
                <h4>Escrita</h4>
                <p style={{ marginTop: 0, fontSize: 13, color: '#575b41' }}>{reveal.writing.resumo}</p>
                {['precisao', 'naturalidade', 'vocabulario', 'fluencia'].map((axis) => (
                  <div className="axis-row" key={axis} style={{ marginBottom: 8 }}>
                    <div className="axis-row-head"><span>{axis}</span><span>{reveal.writing[axis]}</span></div>
                    <div className="axis-track"><div className="axis-fill" style={{ width: `${reveal.writing[axis]}%` }} /></div>
                  </div>
                ))}
              </div>

              <div className="chart-card">
                <h4>Fala</h4>
                <p style={{ marginTop: 0, fontSize: 13, color: '#575b41' }}>{reveal.speaking.resumo}</p>
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

'use client';

import { useState } from 'react';

const STEPS = [
  { id: 'age', q: 'Quantos anos você tem?', type: 'single', cols: 2, options: ['Menos que 18', '19 a 24', '25 a 30', '31 a 35', '36 a 40', '41 a 45', '46 a 50', '51 a 55', '56 a 60', '60+'] },
  { id: 'gender', q: 'Qual seu gênero?', type: 'single', cols: 2, options: ['Masculino', 'Feminino', 'Prefiro não dizer', 'Outro'] },
  { id: 'level', q: 'Qual seu nível de inglês?', type: 'single', cols: 1, options: ['Sei algumas poucas palavras.', 'Posso usar frases simples.', 'Posso ter conversas curtas.', 'Posso discutir sobre diferentes tópicos.', 'Posso falar fluentemente.'] },
  { id: 'reasons', q: 'Por que quer melhorar seu inglês?', sub: 'Pode escolher mais de uma.', type: 'multi', cols: 1, options: ['Avançar na minha carreira.', 'Me preparar para viagens.', 'Estudar fora do país.', 'Conversar com amigos e familiares.', 'Assistir séries e filmes sem legenda.', 'Aprender um novo idioma.', 'Outro.'] },
  { id: 'challenges', q: 'Qual seu principal desafio com o inglês?', sub: 'Pode escolher mais de uma.', type: 'multi', cols: 1, options: ['Às vezes não encontro as palavras.', 'Fico tímido(a) ou nervoso(a).', 'Não tenho tempo para praticar.', 'Não tenho ninguém para praticar.', 'Minha pronúncia não é muito boa.', 'Tenho muitos erros gramaticais.', 'Não entendo o que as pessoas falam.'] },
  { id: 'dailyGoal', q: 'Qual seu objetivo diário?', sub: 'Quanto tempo por dia?', type: 'single', cols: 2, options: ['5 minutos / dia', '10 minutos / dia', '15 minutos / dia', '20 minutos / dia'] },
];

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);

export function OnboardingClient({ firstName = '' }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState('questions'); // 'questions' | 'terms' | 'done'
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const total = STEPS.length;
  const done = phase === 'done';

  const finish = async (finalAnswers) => {
    setSaving(true);
    // As duas gravações são best-effort e independentes — mandamos em paralelo
    // e seguimos pro pagamento de qualquer jeito (o aceite também fica
    // registrado na sessão; se falhar aqui, o middleware/BD não bloqueia).
    try {
      await Promise.allSettled([
        fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalAnswers),
        }),
        fetch('/api/terms/accept', { method: 'POST' }),
      ]);
    } catch {
      /* best-effort */
    } finally {
      setSaving(false);
      setPhase('done');
    }
  };

  const go = (next, finalAnswers) => {
    if (next >= total) {
      // Terminou as perguntas → step de Termos antes do aceite/pagamento.
      setAnswers(finalAnswers);
      setPhase('terms');
    } else {
      setStep(next);
    }
  };

  const pick = (s, val) => {
    if (s.type === 'multi') {
      const cur = answers[s.id] || [];
      const nextArr = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
      setAnswers((a) => ({ ...a, [s.id]: nextArr }));
    } else {
      const na = { ...answers, [s.id]: val };
      setAnswers(na);
      setTimeout(() => go(step + 1, na), 180);
    }
  };

  if (phase === 'terms') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <button
          type="button"
          onClick={() => setPhase('questions')}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 0 14px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          voltar
        </button>

        <div style={{ fontSize: 40, textAlign: 'center' }}>📄</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, margin: '10px 0 0', color: 'var(--ink)', textAlign: 'center' }}>
          Só falta um passo
        </h2>
        <p style={{ margin: '8px 0 0', color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.55, textAlign: 'center', maxWidth: 380, alignSelf: 'center' }}>
          Antes de começar, dá uma olhada nos nossos Termos e Condições de Uso.
        </p>

        <label
          style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 22, padding: '15px 16px', background: accepted ? 'var(--green-soft)' : 'var(--v2-card-bg)', border: `1.5px solid ${accepted ? 'var(--green)' : 'var(--line)'}`, borderRadius: 14, cursor: 'pointer' }}
        >
          <span
            onClick={(e) => { e.preventDefault(); setAccepted((v) => !v); }}
            style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${accepted ? 'var(--green)' : 'var(--line)'}`, background: accepted ? 'var(--green)' : 'transparent', flexShrink: 0, display: 'grid', placeItems: 'center', marginTop: 1 }}
          >
            {accepted && <Check />}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.5 }}>
            Li e aceito os{' '}
            <a href="/termos" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'underline' }}>
              Termos e Condições de Uso
            </a>
            .
          </span>
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
        </label>

        <button
          type="button"
          onClick={() => finish(answers)}
          disabled={!accepted || saving}
          style={{ marginTop: 20, width: '100%', border: 'none', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 800, cursor: accepted && !saving ? 'pointer' : 'default', background: accepted ? 'var(--green)' : 'var(--line)', color: accepted ? '#fff' : 'var(--ink-soft)' }}
        >
          {saving ? 'Salvando…' : 'Aceitar e continuar'}
        </button>
      </div>
    );
  }

  if (done) {
    const goal = answers.dailyGoal || '';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '30px 0' }}>
        <div style={{ fontSize: 46 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink)' }}>Tudo pronto{firstName ? `, ${firstName}` : ''}!</h2>
        <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14, maxWidth: 340, lineHeight: 1.5 }}>
          Montamos seu plano com base nas suas respostas. Agora é só desbloquear o Cadence e começar.
        </p>
        {goal && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-dark, var(--green))', background: 'var(--green-soft)', borderRadius: 999, padding: '5px 12px', marginTop: 4 }}>🎯 {goal}</span>
        )}
        <a href="/pagamento" style={{ marginTop: 12, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 14, padding: '15px 30px', fontWeight: 800, fontSize: 15, cursor: 'pointer', textDecoration: 'none' }}>
          Desbloquear o Cadence →
        </a>
      </div>
    );
  }

  const s = STEPS[step];
  const sel = answers[s.id];
  const isSel = (o) => (s.type === 'multi' ? (sel || []).includes(o) : sel === o);
  const cols2 = s.cols === 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* progresso */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {STEPS.map((_, i) => (
          <span key={i} style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${i < step ? 100 : i === step ? 55 : 0}%`, background: 'var(--green)', transition: 'width .3s ease' }} />
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setStep((v) => Math.max(0, v - 1))}
        style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 0 12px', opacity: step === 0 ? 0 : 1, pointerEvents: step === 0 ? 'none' : 'auto' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        voltar
      </button>

      <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, margin: 0, color: 'var(--ink)' }}>{s.q}</h2>
      {s.sub && <p style={{ margin: '8px 0 0', color: 'var(--ink-soft)', fontSize: 13.5 }}>{s.sub}</p>}

      <div style={{ display: 'grid', gap: 9, marginTop: 20, gridTemplateColumns: cols2 ? '1fr 1fr' : '1fr' }}>
        {s.options.map((o) => {
          const on = isSel(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => pick(s, o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11, textAlign: cols2 ? 'center' : 'left', justifyContent: cols2 ? 'center' : 'flex-start',
                width: '100%', background: on ? 'var(--green-soft)' : 'var(--v2-card-bg)', border: `1.5px solid ${on ? 'var(--green)' : 'var(--line)'}`,
                borderRadius: 14, padding: cols2 ? '13px 12px' : '14px 15px', fontSize: cols2 ? 14 : 14.5, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
              }}
            >
              {!cols2 && (
                <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${on ? 'var(--green)' : 'var(--line)'}`, background: on ? 'var(--green)' : 'transparent', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                  {on && <Check />}
                </span>
              )}
              <span style={{ flex: cols2 ? 'unset' : 1 }}>{o}</span>
            </button>
          );
        })}
      </div>

      {s.type === 'multi' && (
        <button
          type="button"
          onClick={() => go(step + 1, answers)}
          disabled={!(sel && sel.length) || saving}
          style={{ marginTop: 20, width: '100%', border: 'none', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 800, cursor: sel && sel.length ? 'pointer' : 'default', background: sel && sel.length ? 'var(--green)' : 'var(--line)', color: sel && sel.length ? '#fff' : 'var(--ink-soft)' }}
        >
          {saving ? 'Salvando…' : 'Continuar'}
        </button>
      )}
    </div>
  );
}

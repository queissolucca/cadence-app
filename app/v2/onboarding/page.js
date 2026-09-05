'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { Card } from '../../../components/ui';

const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '11px 12px',
  border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, color: 'var(--ink)', fontFamily: 'inherit',
};
const btnStyle = {
  border: 'none', borderRadius: 12, padding: '13px 16px', fontWeight: 700,
  background: 'var(--green)', color: '#fff', fontSize: 15, width: '100%',
};

export default function OnboardingV2() {
  const router = useRouter();
  const [step, setStep] = useState('name'); // 'name' | 'baseline'
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', user.id);

      const res = await fetch('/api/baseline', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'baseline_failed');
      setQuestion(data.baseline_question);
      setStep('baseline');
    } catch {
      setError('Não consegui continuar agora. Tenta de novo.');
    }
    setLoading(false);
  };

  const submitAnswer = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/baseline/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answer.trim() }),
      });
      if (!res.ok) throw new Error('save_failed');
      // Novo funil: depois do diagnóstico vem o pagamento (último passo).
      router.push('/pagamento');
      router.refresh();
    } catch {
      setError('Não consegui salvar agora. Tenta de novo.');
    }
    setLoading(false);
  };

  return (
    <div className="v2-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-ui-v2)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)' }}>cadence</span>
        </div>
        <Card>
          {step === 'name' ? (
            <form onSubmit={submitName} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Como podemos te chamar?</p>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="seu nome" style={inputStyle} autoFocus />
              {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading || !name.trim()} style={btnStyle}>
                {loading ? 'Um momento…' : 'Continuar'}
              </button>
            </form>
          ) : (
            <form onSubmit={submitAnswer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>norte inicial</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{question}</p>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="responda em inglês…"
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                autoFocus
              />
              {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading || !answer.trim()} style={btnStyle}>
                {loading ? 'Salvando…' : 'Começar a praticar'}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

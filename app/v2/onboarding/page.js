'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { Card } from '../../../components/ui';
import { CadenceLogo } from '../../../components/v2/CadenceLogo';

const inputStyle = {
  display: 'block', width: '100%', marginTop: 4, padding: '11px 12px',
  border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, color: 'var(--ink)', fontFamily: 'inherit',
};
const btnStyle = {
  border: 'none', borderRadius: 12, padding: '13px 16px', fontWeight: 700,
  background: 'var(--green)', color: '#fff', fontSize: 15, width: '100%',
};

// Último passo do funil (depois do pagamento): só o nome. O diagnóstico
// ("norte inicial") foi removido — a trilha v2 não depende dele.
export default function OnboardingV2() {
  const router = useRouter();
  const [name, setName] = useState('');
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
      const { error: upErr } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', user.id);
      if (upErr) throw upErr;
      router.push('/v2');
      router.refresh();
    } catch {
      setError('Não consegui continuar agora. Tenta de novo.');
      setLoading(false);
    }
  };

  return (
    <div className="v2-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-ui-v2)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <CadenceLogo word={28} />
        </div>
        <Card>
          <form onSubmit={submitName} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Como podemos te chamar?</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="seu nome" style={inputStyle} autoFocus />
            {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
            <button type="submit" disabled={loading || !name.trim()} style={btnStyle}>
              {loading ? 'Um momento…' : 'Entrar no Cadence'}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

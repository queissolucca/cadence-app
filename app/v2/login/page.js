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
  background: 'var(--green)', color: '#fff', fontSize: 15,
};
const linkBtnStyle = {
  border: 'none', background: 'none', color: 'var(--green-dark)', textDecoration: 'underline',
  cursor: 'pointer', padding: 0, fontSize: 12.5, fontFamily: 'inherit',
};

export default function LoginPageV2() {
  const router = useRouter();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'magic'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === 'magic') {
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/v2` },
        });
        if (err) throw err;
        setMagicSent(true);
      } else if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/v2` },
        });
        if (err) throw err;
        router.push('/v2');
        router.refresh();
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push('/v2');
        router.refresh();
      }
    } catch (err) {
      setError(err.message || 'Não consegui entrar agora. Tenta de novo.');
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
          {magicSent ? (
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)' }}>
              Te enviamos um link mágico pro seu e-mail — clica nele pra entrar.
            </p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                E-mail
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
              </label>
              {mode !== 'magic' && (
                <label style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Senha
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                  />
                </label>
              )}
              {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading} style={btnStyle}>
                {loading ? 'Um momento…' : mode === 'signup' ? 'Criar conta' : mode === 'magic' ? 'Enviar link mágico' : 'Entrar'}
              </button>
            </form>
          )}
          {!magicSent && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); }} style={linkBtnStyle}>
                {mode === 'signup' ? 'já tenho conta' : 'criar conta'}
              </button>
              <button type="button" onClick={() => { setMode(mode === 'magic' ? 'signin' : 'magic'); setError(''); }} style={linkBtnStyle}>
                {mode === 'magic' ? 'usar senha' : 'entrar com link mágico'}
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

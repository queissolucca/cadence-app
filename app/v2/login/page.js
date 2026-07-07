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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const signInWithGoogle = async () => {
    setError('');
    setLoading(true);
    const supabase = createClient();
    // Mesmo padrão já usado (e funcionando) em app/LoginScreen.js — o
    // provider Google já está configurado no projeto Supabase, só falta o
    // botão aqui. next=/v2 fecha o loop de volta pro app novo.
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/v2` },
    });
    if (err) {
      setError('Não consegui iniciar o login com Google. Tenta de novo.');
      setLoading(false);
    }
  };

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
        // full_name via options.data — o trigger handle_new_user (migration
        // 0001) já lê raw_user_meta_data.full_name pra popular o profile,
        // igual já faz hoje com o Google OAuth. Não duplica com um update
        // manual depois.
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/v2`,
            data: { full_name: name.trim() },
          },
        });
        if (err) throw err;
        // Se o projeto exige confirmação por e-mail, signUp() não erra e
        // não cria sessão — sem isto, o redirect abaixo simplesmente
        // "não fazia nada" (o middleware bounce de volta pro login sem
        // sessão), o que parecia um bug/erro sem nenhuma mensagem.
        if (!data.session) {
          setConfirmSent(true);
        } else {
          router.push('/v2');
          router.refresh();
        }
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
          ) : confirmSent ? (
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)' }}>
              Quase lá — te enviamos um e-mail de confirmação. Clica no link pra ativar sua conta e entrar.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={loading}
                style={{ ...btnStyle, background: 'var(--v2-card-bg)', color: 'var(--v2-card-fg)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', marginBottom: 16 }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
                </svg>
                {loading ? 'Um momento…' : 'Continuar com Google'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px' }}>
                <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>ou</span>
                <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>
            </>
          )}
          {!magicSent && !confirmSent && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'signup' && (
                <label style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Nome
                  <input type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                </label>
              )}
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
          {!magicSent && !confirmSent && (
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

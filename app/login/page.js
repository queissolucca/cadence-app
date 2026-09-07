'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { Card } from '../../components/ui';
import { ThemeProviderV2 } from '../../components/v2/ThemeProviderV2';
import { CadenceLogo } from '../../components/v2/CadenceLogo';
import { PasswordInput, NewPasswordFields } from '../../components/v2/PasswordInput';
import { friendlyAuthError } from '../../lib/authErrors';

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

// Rota pública top-level (cadenceenglish.app/login) — /v2/login vira só um
// redirect pra cá (ver app/v2/login/page.js). Fica fora da árvore /v2, por
// isso embrulha o próprio ThemeProviderV2 (normalmente vem de app/v2/layout.js).
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'magic' | 'reset'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [existingSent, setExistingSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const sent = magicSent || confirmSent || existingSent || resetSent;
  // Trava do "Criar conta": só libera com "Confirmar senha" idêntico a "Senha"
  // (a Senha é sempre o padrão). O vermelho do campo mora no NewPasswordFields.
  const submitBlocked = mode === 'signup' && confirmPassword !== password;

  const redirectTo = (next = '/v2') => `${window.location.origin}/auth/callback?next=${next}`;

  const signInWithGoogle = async () => {
    setError('');
    setLoading(true);
    const supabase = createClient();

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo() },
    });
    if (err) {
      setError('Não consegui iniciar o login com Google. Tenta de novo.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === 'magic') {
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo() },
        });
        if (err) throw err;
        setMagicSent(true);
      } else if (mode === 'reset') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo('/auth/nova-senha'),
        });
        if (err) throw err;
        setResetSent(true);
      } else if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo(),
            data: { full_name: name.trim() },
          },
        });
        if (err) throw err;

        // Quando o e-mail JÁ tem conta, o Supabase não manda e-mail nenhum e
        // não devolve erro (proteção contra enumeração de usuários): vem um
        // user falso com identities: []. Era esse o caso em que "criar conta"
        // parecia dar certo e nada chegava na caixa de entrada — aqui a gente
        // detecta e manda um link de acesso, pra que um e-mail chegue sempre.
        const alreadyRegistered =
          data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
        if (alreadyRegistered) {
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false, emailRedirectTo: redirectTo() },
          });
          if (otpErr) throw otpErr;
          setExistingSent(true);
        } else if (!data.session) {
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
      setError(friendlyAuthError(err));
    }
    setLoading(false);
  };

  // Reenvio pra quem não recebeu: confirmação de cadastro usa `resend`, os
  // outros casos remandam o link (de acesso ou de redefinição).
  const resend = async () => {
    setError('');
    setResent(false);
    setResending(true);
    const supabase = createClient();
    try {
      if (confirmSent) {
        const { error: err } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: redirectTo() },
        });
        if (err) throw err;
      } else if (resetSent) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo('/auth/nova-senha'),
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false, emailRedirectTo: redirectTo() },
        });
        if (err) throw err;
      }
      setResent(true);
    } catch (err) {
      setError(friendlyAuthError(err));
    }
    setResending(false);
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const submitLabel = {
    signup: 'Criar conta',
    magic: 'Enviar link de acesso',
    reset: 'Enviar link de redefinição',
    signin: 'Entrar',
  }[mode];

  return (
    <ThemeProviderV2>
      <div className="v2-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <CadenceLogo word={28} />
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>você já sabe inglês. hora de aprender de vez</p>
          </div>
          <Card>
            {sent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)' }}>
                  {magicSent && 'Te enviamos um link de acesso pro seu e-mail — clica nele pra entrar.'}
                  {confirmSent && 'Quase lá — te enviamos um e-mail de confirmação. Clica no link pra ativar sua conta e entrar.'}
                  {existingSent && 'Esse e-mail já tem conta no Cadence — te enviamos um link de acesso pra entrar (a senha que você digitou agora não foi alterada).'}
                  {resetSent && 'Te enviamos um link pra criar uma senha nova. Clica nele e escolhe a senha.'}
                </p>
                {resent && (
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--green-dark)' }}>Enviado de novo — olha sua caixa de entrada (e o spam).</p>
                )}
                {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
                <button type="button" onClick={resend} disabled={resending} style={{ ...linkBtnStyle, alignSelf: 'flex-start' }}>
                  {resending ? 'Enviando…' : 'não recebeu? reenviar e-mail'}
                </button>
              </div>
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
                  {mode === 'signin' && (
                    <PasswordInput label="Senha" value={password} onChange={setPassword} autoComplete="current-password" />
                  )}
                  {mode === 'signup' && (
                    <NewPasswordFields
                      password={password}
                      confirm={confirmPassword}
                      onPassword={setPassword}
                      onConfirm={setConfirmPassword}
                      labels={{ password: 'Senha', confirm: 'Confirmar senha' }}
                    />
                  )}
                  {mode === 'reset' && (
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-soft)' }}>
                      Esqueceu a senha? Mandamos um link pro seu e-mail pra você criar uma nova.
                    </p>
                  )}
                  {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || submitBlocked}
                    style={{ ...btnStyle, opacity: loading || submitBlocked ? 0.5 : 1, cursor: submitBlocked ? 'not-allowed' : 'pointer' }}
                  >
                    {loading ? 'Um momento…' : submitLabel}
                  </button>
                </form>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                  <button type="button" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')} style={linkBtnStyle}>
                    {mode === 'signup' ? 'já tenho conta' : 'criar conta'}
                  </button>
                  <button type="button" onClick={() => switchMode(mode === 'magic' ? 'signin' : 'magic')} style={linkBtnStyle}>
                    {mode === 'magic' ? 'usar senha' : 'entrar direto pelo e-mail'}
                  </button>
                </div>
                {mode !== 'signup' && (
                  <div style={{ marginTop: 10 }}>
                    <button type="button" onClick={() => switchMode(mode === 'reset' ? 'signin' : 'reset')} style={linkBtnStyle}>
                      {mode === 'reset' ? 'voltar pro login' : 'esqueci minha senha'}
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </ThemeProviderV2>
  );
}

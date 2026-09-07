'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { Card } from '../../../components/ui';
import { ThemeProviderV2 } from '../../../components/v2/ThemeProviderV2';
import { CadenceLogo } from '../../../components/v2/CadenceLogo';
import { NewPasswordFields } from '../../../components/v2/PasswordInput';
import { friendlyAuthError } from '../../../lib/authErrors';

const btnStyle = {
  border: 'none', borderRadius: 12, padding: '13px 16px', fontWeight: 700,
  background: 'var(--green)', color: '#fff', fontSize: 15,
};
const linkBtnStyle = {
  border: 'none', background: 'none', color: 'var(--green-dark)', textDecoration: 'underline',
  cursor: 'pointer', padding: 0, fontSize: 12.5, fontFamily: 'inherit',
};

// Destino do link de "esqueci minha senha": o /auth/callback troca o código
// por uma sessão de recuperação e manda pra cá. Aqui é o único lugar onde dá
// pra trocar a senha SEM a senha antiga — o link no e-mail é a prova de quem é
// a pessoa. (Trocar a senha estando logado normalmente exige a senha atual:
// aba Perfil → Senha.)
export default function NovaSenhaPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
    });
  }, []);

  const blocked = password.length < 6 || password !== confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (blocked) return;
    setError('');
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(friendlyAuthError(err));
      setSaving(false);
      return;
    }
    // Registra no banco (password_set_at + histórico em user_events).
    try {
      await fetch('/api/account/password/record', { method: 'POST' });
    } catch {
      /* best-effort: a senha já trocou */
    }
    setDone(true);
    setSaving(false);
  };

  return (
    <ThemeProviderV2>
      <div className="v2-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <CadenceLogo word={28} />
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>escolhe sua senha nova</p>
          </div>
          <Card>
            {checking ? (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>Um momento…</p>
            ) : done ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)' }}>
                  Senha alterada. Agora você entra com e-mail e senha.
                </p>
                <button type="button" onClick={() => { router.push('/v2'); router.refresh(); }} style={btnStyle}>
                  Ir pro app
                </button>
              </div>
            ) : !hasSession ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)' }}>
                  Esse link expirou ou já foi usado. Pede um novo link de redefinição na tela de login.
                </p>
                <button type="button" onClick={() => router.push('/login')} style={{ ...linkBtnStyle, alignSelf: 'flex-start' }}>
                  voltar pro login
                </button>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <NewPasswordFields
                  password={password}
                  confirm={confirm}
                  onPassword={setPassword}
                  onConfirm={setConfirm}
                  labels={{ password: 'Senha nova', confirm: 'Confirmar senha nova' }}
                  autoFocus
                />
                {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
                <button
                  type="submit"
                  disabled={saving || blocked}
                  style={{ ...btnStyle, opacity: saving || blocked ? 0.5 : 1, cursor: saving || blocked ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Salvando…' : 'Salvar senha nova'}
                </button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </ThemeProviderV2>
  );
}

'use client';

import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { PasswordInput, NewPasswordFields } from './PasswordInput';
import { friendlyAuthError } from '../../lib/authErrors';

// Diálogo "Senha" da aba Perfil. Dois modos, decididos pelo `hasPassword` que
// vem do servidor:
//   • conta JÁ tem senha  → REDEFINIR: exige a senha atual (a trava) + nova +
//     confirmação idêntica;
//   • conta sem senha (entrou por Google ou link mágico) → DEFINIR: só nova +
//     confirmação (a sessão já prova quem é).
// A senha antiga é conferida no servidor (/api/account/password), não aqui.

const API_ERRORS = {
  wrong_current_password: 'Senha atual incorreta.',
  current_password_required: 'Digita sua senha atual.',
  weak_password: 'A senha precisa ter pelo menos 6 caracteres.',
  passwords_dont_match: 'As senhas precisam ser iguais.',
  same_password: 'A senha nova precisa ser diferente da atual.',
  not_authenticated: 'Sua sessão expirou. Entra de novo pra trocar a senha.',
  invalid_body: 'Não consegui salvar agora. Tenta de novo.',
};

export function PasswordDialog({ open, onClose, hasPassword, onSaved }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const blocked = next.length < 6 || next !== confirm || (hasPassword && current.length === 0);

  const close = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
    setDone(false);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (blocked) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: confirm }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(API_ERRORS[json.error] || friendlyAuthError(json.message || json.error));
        setSaving(false);
        return;
      }
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
      if (onSaved) onSaved();
    } catch {
      setError('Sem conexão agora. Tenta de novo.');
    }
    setSaving(false);
  };

  return (
    <BottomSheet open={open} onClose={close} title={hasPassword ? 'Redefinir senha' : 'Definir senha'}>
      {done ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            Senha {hasPassword ? 'alterada' : 'definida'}. Da próxima vez você pode entrar com e-mail e senha.
          </p>
          <button
            type="button"
            onClick={close}
            className="v2-card-dark"
            style={{ border: 'none', padding: '11px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Fechar
          </button>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!hasPassword && (
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
              Você entra por Google ou link no e-mail e ainda não tem senha. Defina uma pra também poder entrar
              com e-mail e senha.
            </p>
          )}
          {hasPassword && (
            <PasswordInput
              label="Senha atual"
              value={current}
              onChange={setCurrent}
              autoComplete="current-password"
              autoFocus
            />
          )}
          <NewPasswordFields
            password={next}
            confirm={confirm}
            onPassword={setNext}
            onConfirm={setConfirm}
            labels={{ password: 'Senha nova', confirm: 'Confirmar senha nova' }}
            autoFocus={!hasPassword}
          />
          {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--red)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button
              type="submit"
              disabled={saving || blocked}
              className="v2-card-dark"
              style={{
                flex: 1, border: 'none', padding: '11px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                cursor: saving || blocked ? 'not-allowed' : 'pointer', opacity: saving || blocked ? 0.5 : 1,
              }}
            >
              {saving ? 'Salvando…' : hasPassword ? 'Redefinir senha' : 'Definir senha'}
            </button>
            <button
              type="button"
              onClick={close}
              style={{
                flex: 1, background: 'transparent', border: '1px solid var(--line)', padding: '11px',
                borderRadius: 12, fontWeight: 600, fontSize: 14, color: 'var(--v2-card-fg, var(--ink))', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </BottomSheet>
  );
}

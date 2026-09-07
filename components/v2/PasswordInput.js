'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Campos de senha compartilhados pelo /login, pelo diálogo "Senha" dos Ajustes
// e pela tela de nova senha (/auth/nova-senha) — assim o botão de olho
// (mostrar/esconder) e a trava de "confirmação idêntica à senha" se comportam
// exatamente igual nos três lugares.

const labelStyle = { fontSize: 12, color: 'var(--ink-soft)' };
const inputStyle = {
  display: 'block', width: '100%', padding: '11px 12px', paddingRight: 44,
  border: '1px solid var(--line)', borderRadius: 10, fontSize: 14,
  color: 'var(--v2-card-fg, var(--ink))', background: 'var(--v2-card-bg)', fontFamily: 'inherit',
};
const eyeBtnStyle = {
  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, padding: 0, border: 'none', background: 'none',
  borderRadius: 8, color: 'var(--ink-soft)', cursor: 'pointer',
};

// Sempre no escopo do módulo: se fosse declarado dentro do componente que o
// usa, o React trataria isso como um tipo novo a cada render e remontaria o
// input — o campo perderia o foco a cada tecla digitada.
export function PasswordInput({
  label,
  value,
  onChange,
  autoComplete = 'new-password',
  invalid = false,
  minLength = 6,
  required = true,
  autoFocus = false,
  visible,
  onToggleVisible,
}) {
  // Sem controle externo (visible/onToggleVisible), o campo cuida do próprio olho.
  const [own, setOwn] = useState(false);
  const shown = visible === undefined ? own : visible;
  const toggle = onToggleVisible || (() => setOwn((v) => !v));

  return (
    <label style={labelStyle}>
      {label}
      <div style={{ position: 'relative', marginTop: 4 }}>
        <input
          type={shown ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          style={{
            ...inputStyle,
            border: invalid ? '1px solid var(--red)' : inputStyle.border,
            color: invalid ? 'var(--red)' : inputStyle.color,
          }}
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={shown ? 'Esconder senha' : 'Mostrar senha'}
          title={shown ? 'Esconder senha' : 'Mostrar senha'}
          style={eyeBtnStyle}
        >
          {shown ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
        </button>
      </div>
    </label>
  );
}

// Par "senha + confirmação": um olho só revela os dois (é o que permite
// comparar), e a confirmação fica vermelha enquanto for diferente da senha —
// que é sempre o padrão. Quem usa trava o botão com `confirm !== password`.
export function NewPasswordFields({
  password,
  confirm,
  onPassword,
  onConfirm,
  labels = { password: 'Nova senha', confirm: 'Confirmar nova senha' },
  autoComplete = 'new-password',
  autoFocus = false,
}) {
  const [visible, setVisible] = useState(false);
  const toggle = () => setVisible((v) => !v);
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <>
      <PasswordInput
        label={labels.password}
        value={password}
        onChange={onPassword}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        visible={visible}
        onToggleVisible={toggle}
      />
      <div>
        <PasswordInput
          label={labels.confirm}
          value={confirm}
          onChange={onConfirm}
          autoComplete={autoComplete}
          invalid={mismatch}
          visible={visible}
          onToggleVisible={toggle}
        />
        {mismatch && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--red)' }}>As senhas precisam ser iguais.</p>
        )}
      </div>
    </>
  );
}

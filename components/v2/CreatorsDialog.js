'use client';

import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { NICHOS, NICHO_OUTROS, soDigitos, formatarNumero, validarCreator } from '../../lib/creators';

// Diálogo "Para Creators" da aba Perfil: e-mail, telefone (DDD separado, só
// números), @ do Instagram e nicho(s). Tudo obrigatório — as regras vivem em
// lib/creators.js e o servidor confere de novo em /api/creators.

const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--ink-soft)' };
const inputStyle = {
  display: 'block', width: '100%', padding: '11px 12px', border: '1px solid var(--line)', borderRadius: 10,
  fontSize: 14, color: 'var(--v2-card-fg, var(--ink))', background: 'var(--v2-card-bg)', fontFamily: 'inherit',
};
const errStyle = { margin: 0, fontSize: 12, color: 'var(--red)' };

const inputComErro = (erro) => (erro ? { ...inputStyle, border: '1px solid var(--red)' } : inputStyle);

const VAZIO = { email: '', ddd: '', telefone: '', instagram: '', nichos: [], outro: '' };

export function CreatorsDialog({ open, onClose, email = '' }) {
  const [form, setForm] = useState({ ...VAZIO, email });
  // Erro de campo só aparece depois que a pessoa tenta enviar — antes disso,
  // o formulário vazio não fica todo vermelho.
  const [tentou, setTentou] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const erros = validarCreator(form);
  const mostra = tentou ? erros : {};
  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const toggleNicho = (n) =>
    setForm((f) => ({ ...f, nichos: f.nichos.includes(n) ? f.nichos.filter((x) => x !== n) : [...f.nichos, n] }));

  const close = () => {
    setForm({ ...VAZIO, email });
    setTentou(false);
    setError('');
    setDone(false);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setTentou(true);
    if (Object.keys(erros).length) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('failed');
      setDone(true);
    } catch {
      setError('Não consegui enviar agora. Tenta de novo.');
    }
    setSaving(false);
  };

  const outrosMarcado = form.nichos.includes(NICHO_OUTROS);

  return (
    <BottomSheet open={open} onClose={close} title="Para Creators">
      {done ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 14 }}>Recebemos! A gente te chama pelo e-mail ou WhatsApp. 🙌</p>
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
        <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
            Cria conteúdo e quer fazer parceria com a Cady? Deixa seus contatos que a gente fala com você.
          </p>

          <label style={labelStyle}>
            E-mail
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="nome@gmail.com"
              aria-invalid={!!mostra.email || undefined}
              style={inputComErro(mostra.email)}
            />
            {mostra.email && <p style={errStyle}>{mostra.email}</p>}
          </label>

          <div style={labelStyle}>
            Telefone (WhatsApp)
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                inputMode="numeric"
                autoComplete="tel-area-code"
                aria-label="DDD"
                value={form.ddd}
                onChange={(e) => set('ddd', soDigitos(e.target.value).slice(0, 2))}
                placeholder="DDD"
                style={{ ...inputComErro(mostra.telefone), width: 72, flexShrink: 0, textAlign: 'center' }}
              />
              <input
                inputMode="numeric"
                autoComplete="tel-local"
                aria-label="Número"
                value={formatarNumero(form.telefone)}
                onChange={(e) => set('telefone', soDigitos(e.target.value).slice(0, 9))}
                placeholder="91234-5678"
                style={inputComErro(mostra.telefone)}
              />
            </div>
            {mostra.telefone && <p style={errStyle}>{mostra.telefone}</p>}
          </div>

          <label style={labelStyle}>
            @ do Instagram
            <input
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.instagram}
              onChange={(e) => set('instagram', e.target.value.replace(/\s/g, ''))}
              placeholder="@seuperfil"
              aria-invalid={!!mostra.instagram || undefined}
              style={inputComErro(mostra.instagram)}
            />
            {mostra.instagram && <p style={errStyle}>{mostra.instagram}</p>}
          </label>

          <div style={labelStyle}>
            Qual é o seu nicho hoje? (pode marcar mais de um)
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {[...NICHOS, NICHO_OUTROS].map((n) => {
                const on = form.nichos.includes(n);
                return (
                  <label
                    key={n}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999,
                      border: `1px solid ${on ? 'var(--green-dark)' : 'var(--line)'}`,
                      background: on ? 'var(--green-soft)' : 'transparent',
                      color: on ? 'var(--green-dark)' : 'var(--v2-card-fg, var(--ink))',
                      fontSize: 13, fontWeight: on ? 600 : 400, cursor: 'pointer',
                    }}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggleNicho(n)} style={{ margin: 0, accentColor: 'var(--green-dark)' }} />
                    {n}
                  </label>
                );
              })}
            </div>
            {outrosMarcado && (
              <input
                value={form.outro}
                onChange={(e) => set('outro', e.target.value)}
                placeholder="qual é o seu nicho?"
                aria-label="Outro nicho"
                autoFocus
                style={{ ...inputComErro(mostra.nichos && !form.outro.trim()), marginTop: 4 }}
              />
            )}
            {mostra.nichos && <p style={errStyle}>{mostra.nichos}</p>}
          </div>

          {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--red)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button
              type="submit"
              disabled={saving}
              className="v2-card-dark"
              style={{
                flex: 1, border: 'none', padding: '11px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving || (tentou && Object.keys(erros).length) ? 0.5 : 1,
              }}
            >
              {saving ? 'Enviando…' : 'Enviar'}
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

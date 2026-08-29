'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Redimensiona a imagem escolhida pra um quadrado ~256px e devolve um data URL
// JPEG compacto (~15-30KB) — assim a foto fica salva direto no avatar_url do
// Supabase, sem precisar de bucket de Storage.
function resizeToDataUrl(file, size = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Avatar({ url, initial, size = 72 }) {
  return (
    <span
      className="v2-avatar"
      style={{ width: size, height: size, fontSize: size * 0.4, flexShrink: 0 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        <span>{(initial || '?').charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

export function ProfileDialog({ open, onClose, fullName, email, memberSince, streakMax, avatarUrl, avatarInitial }) {
  const router = useRouter();
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [name, setName] = useState(fullName || '');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  if (!open) return null;

  const startEdit = () => {
    setName(fullName || '');
    setAvatarPreview(null);
    setError('');
    setMode('edit');
  };

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await resizeToDataUrl(file);
      setAvatarPreview(url);
    } catch {
      setError('Não consegui carregar essa imagem.');
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = { full_name: name.trim() };
      if (avatarPreview) body.avatar_url = avatarPreview;
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      router.refresh();
      onClose();
    } catch {
      setError('Não consegui salvar. Tenta de novo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 24, zIndex: 200 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="v2-card"
        style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        {mode === 'view' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar url={avatarUrl} initial={avatarInitial} />
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 17, color: 'var(--v2-card-fg, var(--ink))' }}>{fullName || 'Sem nome ainda'}</strong>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Membro desde</span>
                <span style={{ color: 'var(--v2-card-fg, var(--ink))', fontWeight: 600 }}>{memberSince || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Recorde de streak</span>
                <span style={{ color: 'var(--v2-card-fg, var(--ink))', fontWeight: 600 }}>🔥 {streakMax || 0} {streakMax === 1 ? 'dia' : 'dias'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={startEdit} className="v2-card-dark" style={{ flex: 1, border: 'none', padding: '10px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Editar</button>
              <button type="button" onClick={onClose} style={{ flex: 1, background: 'transparent', border: '1px solid var(--line)', padding: '10px', borderRadius: 12, fontWeight: 600, fontSize: 14, color: 'var(--v2-card-fg, var(--ink))', cursor: 'pointer' }}>Fechar</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Avatar url={avatarPreview || avatarUrl} initial={name || avatarInitial} size={80} />
              <button type="button" onClick={() => fileRef.current?.click()} style={{ background: 'transparent', border: 'none', color: 'var(--green-dark, var(--green))', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Trocar foto
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} style={{ display: 'none' }} />
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Nome</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Seu nome"
                style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', fontSize: 15, color: 'var(--v2-card-fg, var(--ink))', background: 'var(--v2-card-bg)' }}
              />
            </label>

            {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--red, #c0392b)' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button type="button" onClick={save} disabled={saving} className="v2-card-dark" style={{ flex: 1, border: 'none', padding: '10px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setMode('view')} style={{ flex: 1, background: 'transparent', border: '1px solid var(--line)', padding: '10px', borderRadius: 12, fontWeight: 600, fontSize: 14, color: 'var(--v2-card-fg, var(--ink))', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

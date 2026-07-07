'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX_EXTRA_THEMES = 2;

// Reusa /api/profile/themes (já existente, já valida max 2 e já invalida o
// daily_content de hoje) — não duplica lógica de persistência aqui.
export function ExtraThemesPicker({ themes, initialSelection }) {
  const router = useRouter();
  const [selection, setSelection] = useState(initialSelection || []);
  const [saving, setSaving] = useState(false);

  const toggle = async (trackId) => {
    const isSelected = selection.includes(trackId);
    let next;
    if (isSelected) {
      next = selection.filter((id) => id !== trackId);
    } else {
      if (selection.length >= MAX_EXTRA_THEMES) return;
      next = [...selection, trackId];
    }
    setSelection(next);
    setSaving(true);
    try {
      await fetch('/api/profile/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeIds: next }),
      });
      router.refresh();
    } catch {
      // seleção já refletida na UI — próxima troca tenta persistir de novo
    }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {themes.map((t) => {
        const selected = selection.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            disabled={saving || (!selected && selection.length >= MAX_EXTRA_THEMES)}
            style={{
              border: '1px solid var(--line)', borderRadius: 999, padding: '8px 14px', fontSize: 13, cursor: 'pointer',
              background: selected ? 'var(--green-soft)' : 'var(--v2-card-bg)',
              color: selected ? 'var(--green-dark)' : 'var(--ink)',
              fontWeight: selected ? 700 : 500,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

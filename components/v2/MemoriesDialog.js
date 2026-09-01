'use client';

import { useEffect, useState } from 'react';

const CATEGORY_LABELS = {
  location: 'Onde mora',
  work: 'Trabalho & carreira',
  hobbies: 'Hobbies & interesses',
  preferences: 'Gostos & preferências',
  relationships: 'Relacionamentos',
  family: 'Família',
  goals: 'Objetivos',
  finance: 'Finanças',
  health: 'Saúde & bem-estar',
  other: 'Outros',
};
const ORDER = ['location', 'work', 'hobbies', 'preferences', 'relationships', 'family', 'goals', 'finance', 'health', 'other'];

// Pop-up "Suas memórias" (Ajustes): o que a Cady lembra de você, por categoria.
// Pode apagar qualquer fato. Só leitura + delete — a criação é automática pelas
// conversas.
export function MemoriesDialog({ open, onClose }) {
  const [items, setItems] = useState(null); // null = carregando

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setItems(null);
    fetch('/api/memory')
      .then((r) => (r.ok ? r.json() : { memories: [] }))
      .then(({ memories }) => { if (alive) setItems(memories || []); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [open]);

  const remove = async (id) => {
    setItems((prev) => (prev || []).filter((m) => m.id !== id));
    fetch(`/api/memory/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  if (!open) return null;

  const groups = ORDER
    .map((cat) => ({ cat, label: CATEGORY_LABELS[cat], list: (items || []).filter((m) => m.category === cat) }))
    .filter((g) => g.list.length > 0);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 200 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="v2-card"
        style={{ width: '100%', maxWidth: 440, maxHeight: '82vh', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <strong style={{ fontSize: 17, color: 'var(--v2-card-fg, var(--ink))' }}>Suas memórias</strong>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
              O que a Cady lembra de você pra personalizar as conversas. Apague o que quiser.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 4, flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 2 }}>
          {items === null && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Carregando…</p>}

          {items !== null && groups.length === 0 && (
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Ainda não há memórias. Converse com a Cady na <strong>Conversa aberta</strong> — ela vai te conhecendo
              (onde mora, hobbies, objetivos…) e usa isso pra personalizar as próximas conversas.
            </p>
          )}

          {groups.map((g) => (
            <div key={g.cat} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--green-dark, var(--green))' }}>{g.label}</span>
              {g.list.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--v2-card-bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '9px 11px' }}>
                  <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.4 }}>{m.fact}</span>
                  <button type="button" onClick={() => remove(m.id)} title="Apagar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 3, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

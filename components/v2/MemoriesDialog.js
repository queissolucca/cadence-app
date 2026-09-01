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

const inputStyle = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 11px', fontSize: 14, color: 'var(--v2-card-fg, var(--ink))', background: 'var(--v2-card-bg)', width: '100%', fontFamily: 'inherit' };

function CatSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
      {ORDER.map((c) => (
        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
      ))}
    </select>
  );
}

// Pop-up "Suas memórias" (Ajustes): o que a Cady lembra de você, por categoria.
// Dá pra ADICIONAR (categoria pré-selecionada), EDITAR e apagar cada fato.
export function MemoriesDialog({ open, onClose }) {
  const [items, setItems] = useState(null); // null = carregando
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ fact: '', category: 'preferences' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ fact: '', category: 'other' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setItems(null);
    setAdding(false);
    setEditingId(null);
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

  const add = async () => {
    const fact = addForm.fact.trim();
    if (!fact || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact, category: addForm.category }),
      });
      if (res.ok) {
        const { memory } = await res.json();
        if (memory) setItems((prev) => [memory, ...(prev || [])]);
        setAddForm({ fact: '', category: 'preferences' });
        setAdding(false);
      }
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditForm({ fact: m.fact, category: m.category });
  };

  const saveEdit = async () => {
    const fact = editForm.fact.trim();
    if (!fact || busy) return;
    const id = editingId;
    setBusy(true);
    setItems((prev) => (prev || []).map((m) => (m.id === id ? { ...m, fact, category: editForm.category } : m)));
    setEditingId(null);
    try {
      await fetch(`/api/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact, category: editForm.category }),
      });
    } catch {
      /* otimista */
    } finally {
      setBusy(false);
    }
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
        style={{ width: '100%', maxWidth: 460, maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <strong style={{ fontSize: 17, color: 'var(--v2-card-fg, var(--ink))' }}>Suas memórias</strong>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
              O que a Cady lembra de você. Adicione, edite ou apague o que quiser.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 4, flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Adicionar */}
        {adding ? (
          <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--green-soft)', border: 'none' }}>
            <textarea style={{ ...inputStyle, minHeight: 54, resize: 'vertical' }} placeholder="Ex.: Mora em São Paulo e adora trilha" value={addForm.fact} onChange={(e) => setAddForm((f) => ({ ...f, fact: e.target.value }))} maxLength={300} />
            <CatSelect value={addForm.category} onChange={(c) => setAddForm((f) => ({ ...f, category: c }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setAdding(false)} style={{ flex: 1, border: '1px solid var(--line)', background: 'transparent', borderRadius: 10, padding: '9px', fontSize: 13, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>Cancelar</button>
              <button type="button" onClick={add} disabled={busy || !addForm.fact.trim()} className="v2-card-dark" style={{ flex: 2, border: 'none', borderRadius: 10, padding: '9px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Salvando…' : 'Salvar memória'}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: '1.5px solid var(--green)', background: 'var(--green-soft)', color: 'var(--green-dark, var(--green))', borderRadius: 10, padding: '10px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Adicionar memória
          </button>
        )}

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 2 }}>
          {items === null && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Carregando…</p>}

          {items !== null && groups.length === 0 && (
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Nenhuma memória ainda. Toque em <strong>Adicionar memória</strong>, ou converse com a Cady na <strong>Conversa aberta</strong> — ela vai te conhecendo sozinha.
            </p>
          )}

          {groups.map((g) => (
            <div key={g.cat} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--green-dark, var(--green))' }}>{g.label}</span>
              {g.list.map((m) => (
                editingId === m.id ? (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--v2-card-bg)', border: '1.5px solid var(--green)', borderRadius: 10, padding: '10px 11px' }}>
                    <textarea style={{ ...inputStyle, minHeight: 48, resize: 'vertical' }} value={editForm.fact} onChange={(e) => setEditForm((f) => ({ ...f, fact: e.target.value }))} maxLength={300} />
                    <CatSelect value={editForm.category} onChange={(c) => setEditForm((f) => ({ ...f, category: c }))} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setEditingId(null)} style={{ flex: 1, border: '1px solid var(--line)', background: 'transparent', borderRadius: 9, padding: '8px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>Cancelar</button>
                      <button type="button" onClick={saveEdit} disabled={busy || !editForm.fact.trim()} className="v2-card-dark" style={{ flex: 2, border: 'none', borderRadius: 9, padding: '8px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Salvar</button>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--v2-card-bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '9px 11px' }}>
                    <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.4 }}>{m.fact}</span>
                    <button type="button" onClick={() => startEdit(m)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 3, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                    </button>
                    <button type="button" onClick={() => remove(m.id)} title="Apagar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 3, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                    </button>
                  </div>
                )
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

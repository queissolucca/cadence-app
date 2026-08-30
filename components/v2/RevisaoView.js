'use client';

import { useMemo, useState } from 'react';

const CATS = {
  correction: { label: 'Correção', color: '#B0722C' },
  phrase: { label: 'Frase', color: 'var(--green-dark, var(--green))' },
  word: { label: 'Palavra', color: '#4C8AD8' },
};

const FILTERS = [
  { id: 'all', label: 'Tudo' },
  { id: 'correction', label: 'Correções' },
  { id: 'phrase', label: 'Frases' },
  { id: 'word', label: 'Palavras' },
];

function Tag({ category }) {
  const c = CATS[category] || CATS.phrase;
  return (
    <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 10.5, fontWeight: 600, color: c.color, border: `1px solid ${c.color}`, opacity: 0.9, padding: '2px 8px', borderRadius: 999 }}>
      {c.label}
    </span>
  );
}

// Aba Revisão: itens guardados (erros, frases, palavras) organizados por
// categoria e por status. "Já sei" mata o item (vai pra Aprendidos) pra não
// acumular infinito. Salva por voz na conversa ou manualmente aqui.
export function RevisaoView({ initialItems = [] }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState('all');
  const [showLearned, setShowLearned] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ term: '', example: '', category: 'phrase' });
  const [saving, setSaving] = useState(false);

  const active = useMemo(() => items.filter((i) => i.status !== 'learned'), [items]);
  const learned = useMemo(() => items.filter((i) => i.status === 'learned'), [items]);
  const shown = filter === 'all' ? active : active.filter((i) => i.category === filter);

  const setStatus = async (id, status) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    fetch(`/api/review/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).catch(() => {});
  };

  const remove = async (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    fetch(`/api/review/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const add = async () => {
    const term = form.term.trim();
    if (!term) return;
    setSaving(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const { id } = await res.json();
        setItems((prev) => [{ id, term, example: form.example.trim() || null, note: null, category: form.category, status: 'active', created_at: new Date().toISOString() }, ...prev]);
        setForm({ term: '', example: '', category: 'phrase' });
        setAdding(false);
      }
    } catch {
      /* noop */
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 11px', fontSize: 14, color: 'var(--v2-card-fg, var(--ink))', background: 'var(--v2-card-bg)', width: '100%' };

  const ItemCard = (it, isLearned) => (
    <div key={it.id} className="v2-card" style={{ padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 6, opacity: isLearned ? 0.7 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Tag category={it.category} />
        <div style={{ display: 'flex', gap: 4 }}>
          {isLearned ? (
            <button type="button" onClick={() => setStatus(it.id, 'active')} title="Revisar de novo" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 12, padding: '2px 6px' }}>revisar</button>
          ) : (
            <button type="button" onClick={() => setStatus(it.id, 'learned')} title="Já sei — arquivar" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--green-soft)', border: 'none', cursor: 'pointer', color: 'var(--green-dark, var(--green))', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              já sei
            </button>
          )}
          <button type="button" onClick={() => remove(it.id)} title="Apagar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 4, display: 'grid', placeItems: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
          </button>
        </div>
      </div>
      <strong style={{ fontSize: 15, color: 'var(--ink)' }}>{it.term}</strong>
      {it.example && <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.45 }}>{it.example}</p>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
        Guarde o que quer treinar de novo — um erro, uma frase natural, uma palavra. Durante a conversa, diga <strong>&quot;save this&quot;</strong> ou <strong>&quot;memorize that&quot;</strong> que a Cadi guarda aqui. Marque <strong>&quot;já sei&quot;</strong> pra tirar da lista quando dominar.
      </p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} style={{ fontSize: 12.5, fontWeight: 600, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: filter === f.id ? '1.5px solid var(--green)' : '1px solid var(--line)', background: filter === f.id ? 'var(--green-soft)' : 'transparent', color: 'var(--ink)' }}>
            {f.label}
          </button>
        ))}
        <button type="button" onClick={() => setAdding((v) => !v)} style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 600, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: 'none', background: 'var(--ink)', color: 'var(--paper, #fff)' }}>
          {adding ? 'fechar' : '+ adicionar'}
        </button>
      </div>

      {adding && (
        <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input style={inputStyle} placeholder="Termo, frase ou palavra" value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))} maxLength={200} />
          <input style={inputStyle} placeholder="Exemplo de uso (opcional)" value={form.example} onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))} maxLength={400} />
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.entries(CATS).map(([id, c]) => (
              <button key={id} type="button" onClick={() => setForm((f) => ({ ...f, category: id }))} style={{ flex: 1, fontSize: 12.5, fontWeight: 600, padding: '8px', borderRadius: 10, cursor: 'pointer', border: form.category === id ? `1.5px solid ${c.color}` : '1px solid var(--line)', background: form.category === id ? 'var(--green-soft)' : 'transparent', color: 'var(--ink)' }}>
                {c.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={add} disabled={saving || !form.term.trim()} className="v2-card-dark" style={{ border: 'none', padding: '10px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {saving ? 'Salvando…' : 'Salvar na revisão'}
          </button>
        </div>
      )}

      {shown.length === 0 && (
        <div className="v2-card" style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13.5, lineHeight: 1.5, padding: 22 }}>
          Nada por aqui ainda. Fale uma conversa e mande a Cadi <strong>&quot;save this&quot;</strong>, ou toque em <strong>+ adicionar</strong>.
        </div>
      )}

      {shown.map((it) => ItemCard(it, false))}

      {learned.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button type="button" onClick={() => setShowLearned((v) => !v)} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: '6px 2px' }}>
            {showLearned ? '▾' : '▸'} Aprendidos ({learned.length})
          </button>
          {showLearned && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              {learned.map((it) => ItemCard(it, true))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

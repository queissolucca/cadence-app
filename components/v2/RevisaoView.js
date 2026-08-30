'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { isDue, boxProgress, SRS_STEPS } from '../../lib/track/srs';

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

const RATINGS = [
  { id: 'again', label: 'De novo', hint: 'volta pro começo' },
  { id: 'good', label: 'Bom', hint: 'sobe uma caixa' },
  { id: 'easy', label: 'Fácil', hint: 'pula uma' },
];

function Tag({ category }) {
  const c = CATS[category] || CATS.phrase;
  return (
    <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 10.5, fontWeight: 600, color: c.color, border: `1px solid ${c.color}`, opacity: 0.9, padding: '2px 8px', borderRadius: 999 }}>
      {c.label}
    </span>
  );
}

// Bolinhas de progresso rumo à graduação (caixa Leitner). Preenchidas = quão
// perto de "dominado".
function BoxDots({ box }) {
  const filled = boxProgress(box);
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }} title={`Caixa ${Math.min(box || 1, SRS_STEPS + 1)} de ${SRS_STEPS + 1}`}>
      {Array.from({ length: SRS_STEPS }, (_, i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < filled ? 'var(--green)' : 'var(--line)' }} />
      ))}
    </span>
  );
}

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

// Aba Revisão: itens guardados (erros, frases, palavras) organizados por
// categoria + repetição espaçada (Leitner). "Revisar hoje" surge os vencidos em
// flashcards ou numa fala com a Cady; acertando várias vezes o item gradua pra
// Aprendidos sozinho (sem acumular infinito). Salva por voz na conversa ou aqui.
export function RevisaoView({ initialItems = [] }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState('all');
  const [showLearned, setShowLearned] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ term: '', example: '', category: 'phrase' });
  const [saving, setSaving] = useState(false);

  // Sessão de flashcards
  const [flash, setFlash] = useState(null); // { queue: [...], idx, flipped, done }

  const active = useMemo(() => items.filter((i) => i.status !== 'learned'), [items]);
  const learned = useMemo(() => items.filter((i) => i.status === 'learned'), [items]);
  const due = useMemo(() => active.filter((i) => isDue(i)), [active]);
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
        setItems((prev) => [{ id, term, example: form.example.trim() || null, note: null, category: form.category, status: 'active', box: 1, due_at: new Date().toISOString(), created_at: new Date().toISOString() }, ...prev]);
        setForm({ term: '', example: '', category: 'phrase' });
        setAdding(false);
      }
    } catch {
      /* noop */
    } finally {
      setSaving(false);
    }
  };

  // ---- Flashcards ----
  const startFlash = () => {
    if (!due.length) return;
    setFlash({ queue: shuffle(due), idx: 0, flipped: false, done: false });
  };

  const rate = async (rating) => {
    const card = flash.queue[flash.idx];
    // Otimista: aplica o SRS no cliente e avança.
    fetch(`/api/review/${card.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!res) return;
        setItems((prev) => prev.map((i) => (i.id === card.id ? { ...i, box: res.box, status: res.status } : i)));
      })
      .catch(() => {});
    const nextIdx = flash.idx + 1;
    if (nextIdx >= flash.queue.length) setFlash((f) => ({ ...f, done: true }));
    else setFlash((f) => ({ ...f, idx: nextIdx, flipped: false }));
  };

  const inputStyle = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 11px', fontSize: 14, color: 'var(--v2-card-fg, var(--ink))', background: 'var(--v2-card-bg)', width: '100%' };

  // ---- Tela de flashcards (substitui a lista enquanto a sessão roda) ----
  if (flash) {
    if (flash.done) {
      return (
        <div className="v2-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, padding: '30px 22px' }}>
          <div style={{ fontSize: 34 }}>🎉</div>
          <strong style={{ fontSize: 18, color: 'var(--ink)' }}>Revisão do dia feita!</strong>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            Cada card ganhou uma nova data de revisão. O que você domina vai graduando pra <strong>Aprendidos</strong> sozinho.
          </p>
          <button type="button" onClick={() => setFlash(null)} className="v2-card-dark" style={{ border: 'none', padding: '11px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 }}>
            Voltar
          </button>
        </div>
      );
    }

    const card = flash.queue[flash.idx];
    const c = CATS[card.category] || CATS.phrase;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" onClick={() => setFlash(null)} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            sair
          </button>
          <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 12.5, color: 'var(--ink-soft)' }}>{flash.idx + 1} / {flash.queue.length}</span>
        </div>

        <button
          type="button"
          onClick={() => setFlash((f) => ({ ...f, flipped: true }))}
          className="v2-card"
          style={{ minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', cursor: flash.flipped ? 'default' : 'pointer', width: '100%' }}
        >
          <Tag category={card.category} />
          <strong style={{ fontSize: 24, color: 'var(--ink)' }}>{card.term}</strong>
          {flash.flipped ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 420 }}>
              {card.example && <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{card.example}</p>}
              {card.note && <p style={{ margin: 0, fontSize: 13, color: c.color, lineHeight: 1.45 }}>{card.note}</p>}
            </div>
          ) : (
            <span style={{ fontSize: 12.5, color: 'var(--ink-faint, var(--ink-soft))' }}>toque pra ver · tente falar em voz alta antes</span>
          )}
        </button>

        {flash.flipped ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {RATINGS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => rate(r.id)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer',
                  padding: '11px 4px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                  border: r.id === 'easy' ? 'none' : `1.5px solid ${r.id === 'again' ? '#B0722C' : 'var(--green)'}`,
                  background: r.id === 'easy' ? 'var(--green)' : 'transparent',
                  color: r.id === 'easy' ? '#16231C' : r.id === 'again' ? '#B0722C' : 'var(--green-dark, var(--green))',
                }}
              >
                {r.label}
                <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>{r.hint}</span>
              </button>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-soft)', textAlign: 'center' }}>Lembrou? Toque no card pra conferir.</p>
        )}
      </div>
    );
  }

  const ItemCard = (it, isLearned) => (
    <div key={it.id} className="v2-card" style={{ padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 6, opacity: isLearned ? 0.7 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag category={it.category} />
          {!isLearned && <BoxDots box={it.box} />}
        </div>
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
      {/* Revisar hoje — os itens vencidos, em flashcards ou falando com a Cady. */}
      {due.length > 0 ? (
        <div className="v2-card-green" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔁</span>
            <div>
              <strong style={{ fontSize: 16 }}>{due.length} {due.length === 1 ? 'card' : 'cards'} pra revisar hoje</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, opacity: 0.85 }}>Rápido nos flashcards, ou treinando a fala.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={startFlash} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#16231C', color: '#fff', border: 'none', borderRadius: 12, padding: '11px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
              ⚡ Flashcards
            </button>
            <Link href="/v2/revisao/praticar" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(255,255,255,0.9)', color: '#16231C', border: 'none', borderRadius: 12, padding: '11px', fontWeight: 700, fontSize: 13.5, textDecoration: 'none' }}>
              🎙 Com a Cady
            </Link>
          </div>
        </div>
      ) : active.length > 0 ? (
        <div className="v2-card" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-soft)', fontSize: 13.5 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          Tudo em dia — nada vencido agora. Volta mais tarde ou treina na conversa.
        </div>
      ) : null}

      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
        Durante a conversa, diga <strong>&quot;save this&quot;</strong> ou <strong>&quot;memorize that&quot;</strong> que a Cady guarda aqui. Você revisa com espaçamento; o que domina vira <strong>Aprendidos</strong> sozinho.
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
          Nada por aqui ainda. Fale uma conversa e mande a Cady <strong>&quot;save this&quot;</strong>, ou toque em <strong>+ adicionar</strong>.
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

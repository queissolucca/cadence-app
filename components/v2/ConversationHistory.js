'use client';

// Barra lateral de histórico (estilo LLM): lista as conversas do usuário,
// agrupadas por dia, com o horário exato (hora:min:seg). Clicar abre a conversa
// no viewer; dá pra apagar e pra começar uma nova.

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return 'Hoje';
  if (sameDay(d, yesterday)) return 'Ontem';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function ConversationHistory({ items, selectedId, onSelect, onNew, onDelete, loading }) {
  // Agrupa em blocos consecutivos por dia (items já vêm ordenados desc).
  const groups = [];
  items.forEach((it) => {
    const label = dayLabel(it.started_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(it);
    else groups.push({ label, items: [it] });
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        type="button"
        onClick={onNew}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
          padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface, #fff)',
          color: 'var(--ink)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nova conversa
      </button>

      {loading && <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', padding: '4px 2px' }}>Carregando…</p>}
      {!loading && items.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', padding: '4px 2px', lineHeight: 1.5 }}>
          Suas conversas vão aparecer aqui. Fale uma vez e ela fica salva.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-soft)', padding: '2px 2px 4px' }}>
            {group.label}
          </span>
          {group.items.map((it) => {
            const isSel = it.id === selectedId;
            return (
              <div
                key={it.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '8px 8px 8px 10px', cursor: 'pointer',
                  background: isSel ? 'var(--green-soft)' : 'transparent',
                }}
                onClick={() => onSelect(it)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.title || 'Conversa'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono-v2, monospace)' }}>
                    {timeLabel(it.started_at)}
                  </div>
                </div>
                <button
                  type="button"
                  title="Apagar"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Apagar esta conversa?')) onDelete(it.id);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', padding: 4, borderRadius: 6, flexShrink: 0, opacity: 0.6 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

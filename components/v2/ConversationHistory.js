'use client';

// Barra lateral da aba Conversar: galeria de Agentes no topo, depois as
// conversas salvas — um grupo "Fixadas" (até 5) e o resto agrupado por dia com
// o horário exato. Cada linha: pin à esquerda, trash à direita.

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

function GroupLabel({ children }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-soft)', padding: '2px 2px 4px' }}>
      {children}
    </span>
  );
}

export function ConversationHistory({ items, selectedId, onSelect, onNew, onDelete, onTogglePin, loading, agents = [], activeAgentId, onSelectAgent }) {
  const pinned = items.filter((i) => i.pinned);
  const rest = items.filter((i) => !i.pinned);

  const groups = [];
  rest.forEach((it) => {
    const label = dayLabel(it.started_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(it);
    else groups.push({ label, items: [it] });
  });

  const renderRow = (it) => {
    const isSel = it.id === selectedId;
    return (
      <div
        key={it.id}
        style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 4, alignItems: 'center',
          borderRadius: 10, padding: '6px 6px', cursor: 'pointer',
          background: isSel ? 'var(--green-soft)' : 'transparent',
        }}
        onClick={() => onSelect(it)}
      >
        <button
          type="button"
          title={it.pinned ? 'Desafixar' : 'Fixar'}
          aria-pressed={it.pinned}
          onClick={(e) => { e.stopPropagation(); onTogglePin(it); }}
          style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', flexShrink: 0, color: it.pinned ? 'var(--green)' : 'var(--ink-soft)', opacity: it.pinned ? 1 : 0.55, display: 'grid', placeItems: 'center' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={it.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
          </svg>
        </button>

        <div style={{ minWidth: 0 }}>
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
          style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', padding: 4, borderRadius: 6, flexShrink: 0, opacity: 0.55, display: 'grid', placeItems: 'center' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {agents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <GroupLabel>Agentes</GroupLabel>
          {agents.map((a) => {
            const activeSel = a.id === activeAgentId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelectAgent && onSelectAgent(a)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '9px 11px', borderRadius: 12,
                  border: activeSel ? '1.5px solid var(--green)' : '1px solid var(--line)',
                  background: activeSel ? 'var(--green-soft)' : 'var(--v2-card-bg)',
                }}
              >
                <span style={{ width: 32, height: 32, borderRadius: 9, background: a.accent, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {a.name.charAt(0)}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--v2-card-fg)' }}>{a.name}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.role}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onNew}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
          padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--v2-card-bg)',
          color: 'var(--v2-card-fg)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
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

      {pinned.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <GroupLabel>📌 Fixadas</GroupLabel>
          {pinned.map(renderRow)}
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <GroupLabel>{group.label}</GroupLabel>
          {group.items.map(renderRow)}
        </div>
      ))}
    </div>
  );
}

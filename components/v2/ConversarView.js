'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConversationClient } from './ConversationClient';
import { ConversationHistory } from './ConversationHistory';

function fullDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// Aba Conversar com histórico ao lado (estilo LLM). Painel esquerdo = lista de
// conversas salvas; painel direito = a conversa ao vivo, ou o transcript de uma
// conversa passada quando o usuário clica pra revisitar um tema.
export function ConversarView({ firstName }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // resumo em visualização, ou null = ao vivo
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const { conversations } = await res.json();
        setItems(conversations || []);
      }
    } catch {
      /* mantém o que tem */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const openConversation = useCallback(async (it) => {
    setSelected(it);
    setDetail(null);
    setDetailLoading(true);
    setRailOpen(false);
    try {
      const res = await fetch(`/api/conversations/${it.id}`);
      if (res.ok) {
        const { conversation } = await res.json();
        setDetail(conversation);
      }
    } catch {
      /* noop */
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const startNew = useCallback(() => {
    setSelected(null);
    setDetail(null);
    setRailOpen(false);
  }, []);

  const remove = useCallback(async (id) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    } catch {
      /* noop */
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
    setSelected((sel) => (sel && sel.id === id ? null : sel));
  }, []);

  return (
    <div className="conv-shell">
      <button className="conv-railtoggle" onClick={() => setRailOpen((o) => !o)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
        {railOpen ? 'Fechar histórico' : `Histórico${items.length ? ` (${items.length})` : ''}`}
      </button>

      <aside className={`conv-rail ${railOpen ? 'open' : ''}`}>
        <ConversationHistory
          items={items}
          selectedId={selected?.id}
          onSelect={openConversation}
          onNew={startNew}
          onDelete={remove}
          loading={loading}
        />
      </aside>

      <div className="conv-main">
        {selected ? (
          <div>
            <button
              onClick={startNew}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 13, cursor: 'pointer', padding: '2px 2px 12px' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              Voltar pra conversa
            </button>
            <h2 style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', margin: 0, color: 'var(--ink)' }}>
              {selected.title || 'Conversa'}
            </h2>
            <p style={{ margin: '4px 0 16px', fontSize: 12.5, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono-v2, monospace)' }}>
              {fullDateTime(selected.started_at)}
            </p>
            {detailLoading && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Carregando conversa…</p>}
            {detail && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(detail.messages || []).map((line, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: line.role === 'you' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%', fontSize: 14, lineHeight: 1.45,
                      background: line.role === 'you' ? 'var(--green-soft)' : 'var(--v2-card-bg, #f4f4f2)',
                      color: 'var(--ink)', borderRadius: 12, padding: '9px 13px',
                    }}
                  >
                    {line.text}
                  </div>
                ))}
                {(!detail.messages || detail.messages.length === 0) && (
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Sem transcrição salva pra esta conversa.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <ConversationClient firstName={firstName} onSaved={fetchHistory} />
        )}
      </div>

      <style jsx>{`
        .conv-shell {
          display: flex;
          gap: 22px;
          align-items: flex-start;
        }
        .conv-rail {
          width: 280px;
          flex-shrink: 0;
          position: sticky;
          top: 16px;
        }
        .conv-main {
          flex: 1;
          min-width: 0;
        }
        .conv-railtoggle {
          display: none;
        }
        @media (max-width: 860px) {
          .conv-shell {
            flex-direction: column;
            gap: 14px;
          }
          .conv-rail {
            width: 100%;
            position: static;
            display: none;
          }
          .conv-rail.open {
            display: block;
          }
          .conv-railtoggle {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            align-self: flex-start;
            padding: 8px 14px;
            border-radius: 10px;
            border: 1px solid var(--line);
            background: var(--surface, #fff);
            color: var(--ink);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }
        }
      `}</style>
    </div>
  );
}

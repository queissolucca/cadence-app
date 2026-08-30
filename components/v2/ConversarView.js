'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConversationClient } from './ConversationClient';
import { TextChatClient } from './TextChatClient';
import { ConversationHistory } from './ConversationHistory';
import { AGENTS, DEFAULT_AGENT } from '../../lib/track/sessionOptions';

function fullDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// Contexto de retomada pro agente — só o trecho recente (custo controlado),
// não a conversa inteira.
function buildResumeContext(messages, topic) {
  const all = messages || [];
  const lines = all.map((m) => `${m.role === 'you' ? 'Student' : 'Coach'}: ${m.text}`).join('\n');
  const head = `You and the student were already having this conversation${topic ? ` about "${topic}"` : ''}. Here's the transcript so far:\n\n`;
  const tail = `\n\nContinue naturally from exactly where it left off — you remember all of this, so don't restart and don't make them repeat themselves.`;
  const budget = 4500; // mantém o trecho mais recente sem estourar o prompt
  const body = lines.length > budget ? `…${lines.slice(-budget)}` : lines;
  return head + body + tail;
}

// Aba Conversar com histórico ao lado (estilo LLM). Painel esquerdo = galeria
// de agentes + lista de conversas salvas; painel direito = a conversa ao vivo,
// ou o transcript de uma conversa passada quando o usuário revisita um tema.
export function ConversarView({ firstName }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // resumo em visualização, ou null = ao vivo
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState(DEFAULT_AGENT);
  const [resume, setResume] = useState(null);
  const [mode, setMode] = useState('voice'); // 'voice' = microfone | 'text' = escrever

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
    setResume(null);
    setRailOpen(false);
  }, []);

  const resumeConversation = useCallback(() => {
    if (!detail) return;
    const topic = detail.title || selected?.title || 'nossa conversa';
    setResume({ context: buildResumeContext(detail.messages, topic), topic, id: detail.id, messages: detail.messages });
    setMode('voice'); // retomar por voz
    setSelected(null);
    setDetail(null);
    setRailOpen(false);
  }, [detail, selected]);

  const selectAgent = useCallback((agent) => {
    setActiveAgent(agent);
    startNew();
  }, [startNew]);

  const remove = useCallback(async (id) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    } catch {
      /* noop */
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
    setSelected((sel) => (sel && sel.id === id ? null : sel));
  }, []);

  const togglePin = useCallback(async (item) => {
    const next = !item.pinned;
    if (next && items.filter((x) => x.pinned).length >= 5) {
      window.alert('Você já fixou 5 conversas. Desafixe uma pra fixar outra.');
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, pinned: next } : x)));
    try {
      const res = await fetch(`/api/conversations/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, pinned: !next } : x)));
    }
  }, [items]);

  return (
    <div className="conv-shell">
      <button className="conv-railtoggle" onClick={() => setRailOpen((o) => !o)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
        {railOpen ? 'Fechar' : `Agentes & histórico${items.length ? ` (${items.length})` : ''}`}
      </button>

      <aside className={`conv-rail ${railOpen ? 'open' : ''}`}>
        <ConversationHistory
          items={items}
          selectedId={selected?.id}
          onSelect={openConversation}
          onNew={startNew}
          onDelete={remove}
          onTogglePin={togglePin}
          loading={loading}
          agents={AGENTS}
          activeAgentId={activeAgent?.id}
          onSelectAgent={selectAgent}
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
            <p style={{ margin: '4px 0 12px', fontSize: 12.5, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono-v2, monospace)' }}>
              {fullDateTime(selected.started_at)}
            </p>
            <button
              onClick={resumeConversation}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18, padding: '9px 16px', borderRadius: 999, border: 'none', background: 'var(--green)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
              Falar sobre isso
            </button>
            {detailLoading && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Carregando conversa…</p>}
            {detail && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(detail.messages || []).map((line, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: line.role === 'you' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%', fontSize: 14, lineHeight: 1.45,
                      background: line.role === 'you' ? 'var(--green-soft)' : 'var(--v2-card-bg)',
                      color: line.role === 'you' ? 'var(--ink)' : 'var(--v2-card-fg)',
                      border: line.role === 'you' ? 'none' : '1px solid var(--line)',
                      borderRadius: 12, padding: '9px 13px',
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
          <div className="conv-live">
            {!resume && (
              <div className="conv-modetoggle">
                <button type="button" className={mode === 'voice' ? 'on' : ''} onClick={() => setMode('voice')}>🎙 Falar</button>
                <button type="button" className={mode === 'text' ? 'on' : ''} onClick={() => setMode('text')}>⌨️ Escrever</button>
              </div>
            )}
            {mode === 'text' && !resume ? (
              <TextChatClient firstName={firstName} agent={activeAgent} onSaved={fetchHistory} />
            ) : (
              <ConversationClient
                firstName={firstName}
                onSaved={() => { fetchHistory(); setResume(null); }}
                agent={activeAgent}
                resumeContext={resume?.context}
                resumeTopic={resume?.topic}
                resumeMessages={resume?.messages}
                resumeId={resume?.id}
              />
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .conv-shell {
          display: flex;
          gap: 22px;
          align-items: flex-start;
        }
        .conv-rail {
          width: 288px;
          flex-shrink: 0;
          position: sticky;
          top: 16px;
        }
        .conv-main {
          flex: 1;
          min-width: 0;
        }
        .conv-live {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .conv-modetoggle {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          margin-bottom: 8px;
          border-radius: 999px;
          background: var(--v2-card-bg);
          border: 1px solid var(--line);
        }
        .conv-modetoggle button {
          border: none;
          background: transparent;
          color: var(--ink-soft);
          font-size: 13px;
          font-weight: 600;
          padding: 7px 16px;
          border-radius: 999px;
          cursor: pointer;
        }
        .conv-modetoggle button.on {
          background: var(--green);
          color: #fff;
        }
        .conv-railtoggle {
          display: none;
        }
        @media (max-width: 860px) {
          .conv-live {
            padding-top: 12px;
          }
        }
        @media (max-width: 860px) {
          .conv-shell {
            flex-direction: column;
            gap: 14px;
            align-items: stretch;
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
            background: var(--v2-card-bg);
            color: var(--v2-card-fg);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }
        }
      `}</style>
    </div>
  );
}

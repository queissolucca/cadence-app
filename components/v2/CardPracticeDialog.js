'use client';

import { useState } from 'react';
import { ConversationClient } from './ConversationClient';
import { TextChatClient } from './TextChatClient';
import { DEFAULT_AGENT } from '../../lib/track/sessionOptions';

const CATS = {
  correction: { label: 'Correção', color: '#B0722C' },
  phrase: { label: 'Frase', color: 'var(--green-dark, var(--green))' },
  word: { label: 'Palavra', color: '#4C8AD8' },
};

// Pop-up de prática rápida de 1 card da Revisão: escolhe FALAR ou ESCREVER e a
// Cady faz um drill relâmpago (direto ao ponto, exemplo, 2 rodadas, parabéns).
// Ao terminar, dá pra marcar como concluído (vai pra Aprendidos).
export function CardPracticeDialog({ item, firstName, onClose, onCompleted }) {
  const [mode, setMode] = useState(null); // null | 'text' | 'voice'
  if (!item) return null;
  const cat = CATS[item.category] || CATS.phrase;

  const conclude = () => {
    onCompleted && onCompleted(item.id);
    onClose && onClose();
  };

  const modeBtn = (m, icon, label) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      style={{ flex: 1, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 8px', borderRadius: 14, border: '1.5px solid var(--line)', background: 'var(--v2-card-bg)', color: 'var(--ink)', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      {label}
    </button>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 16, zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} className="v2-card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Cabeçalho: o card */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 10.5, fontWeight: 600, color: cat.color, border: `1px solid ${cat.color}`, opacity: 0.9, padding: '2px 8px', borderRadius: 999 }}>{cat.label}</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginTop: 8 }}>{item.term}</div>
            {item.example && <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.45 }}>{item.example}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 4, flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {!mode && (
          <>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Prática relâmpago com a Cady — direto ao ponto, 2 rodadas rápidas. Escolha como treinar:
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {modeBtn('voice', '🎙', 'Falar')}
              {modeBtn('text', '⌨️', 'Escrever')}
            </div>
            <button type="button" onClick={conclude} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: 'none', background: 'var(--green-soft)', color: 'var(--green-dark, var(--green))', borderRadius: 12, padding: '11px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              Já aprendi — marcar como concluído
            </button>
          </>
        )}

        {mode && (
          <>
            <button type="button" onClick={() => setMode(null)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              trocar modo
            </button>

            {mode === 'text' ? (
              <TextChatClient firstName={firstName} agent={DEFAULT_AGENT} cardDrill={item} />
            ) : (
              <ConversationClient firstName={firstName} agent={DEFAULT_AGENT} cardDrill={item} />
            )}

            <button type="button" onClick={conclude} className="v2-card-dark" style={{ border: 'none', borderRadius: 12, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              ✓ Concluí — marcar como aprendido
            </button>
          </>
        )}
      </div>
    </div>
  );
}

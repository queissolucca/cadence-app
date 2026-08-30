'use client';

import { useState } from 'react';
import { ConversationClient } from './ConversationClient';
import { TextChatClient } from './TextChatClient';

// Roda uma lição da trilha por VOZ (ElevenLabs) ou por ESCRITA (Claude) — o
// usuário escolhe no toggle. Mesma unidade/alvo/drill nos dois modos.
export function LessonRunner({ unit, agent, firstName }) {
  const [mode, setMode] = useState('voice');

  return (
    <div className="lesson-runner">
      <div className="lesson-toggle">
        <button type="button" className={mode === 'voice' ? 'on' : ''} onClick={() => setMode('voice')}>🎙 Falar</button>
        <button type="button" className={mode === 'text' ? 'on' : ''} onClick={() => setMode('text')}>⌨️ Escrever</button>
      </div>

      {mode === 'text' ? (
        <TextChatClient firstName={firstName} agent={agent} unit={unit} />
      ) : (
        <ConversationClient firstName={firstName} agent={agent} unit={unit} />
      )}

      <style jsx>{`
        .lesson-runner {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }
        .lesson-toggle {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          margin-bottom: 10px;
          border-radius: 999px;
          background: var(--v2-card-bg);
          border: 1px solid var(--line);
        }
        .lesson-toggle button {
          border: none;
          background: transparent;
          color: var(--ink-soft);
          font-size: 13px;
          font-weight: 600;
          padding: 7px 16px;
          border-radius: 999px;
          cursor: pointer;
        }
        .lesson-toggle button.on {
          background: var(--green);
          color: #fff;
        }
      `}</style>
    </div>
  );
}

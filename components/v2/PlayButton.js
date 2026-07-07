'use client';

import { speak } from '../../lib/tts';

export function PlayButton({ text, accent = 'us', rate = 1.0, label = '▶ ouvir e repetir', style }) {
  return (
    <button
      type="button"
      onClick={() => speak(text, { accent, rate })}
      style={{
        border: 'none', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600,
        background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer', flexShrink: 0,
        ...style,
      }}
    >
      {label}
    </button>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TRACK } from '../../lib/track/units';

const tabStyle = (active) => ({
  flex: 1,
  padding: '10px',
  borderRadius: 12,
  border: active ? '1.5px solid var(--green)' : '1px solid var(--line)',
  background: active ? 'var(--green-soft)' : 'var(--v2-card-bg)',
  color: active ? 'var(--green-dark, var(--ink))' : 'var(--ink)',
  fontWeight: 600,
  fontSize: 13.5,
  cursor: 'pointer',
});

// C2 + C3 — tela da trilha: escolhe o nível (B1/B2), navega módulos → lições, e
// toca numa lição pra a Cadi conduzir o drill de 1–2 min.
export function TrilhaView() {
  const [levelCode, setLevelCode] = useState('B1');
  const level = TRACK.find((l) => l.code === levelCode) || TRACK[0];
  const totalUnits = level.modules.reduce((n, m) => n + m.units.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {TRACK.map((l) => (
          <button key={l.code} type="button" onClick={() => setLevelCode(l.code)} style={tabStyle(l.code === levelCode)}>
            {l.code} · {l.name}
          </button>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
        {level.blurb} · {level.modules.length} módulos · {totalUnits} lições de 1–2 min.
      </p>

      {level.modules.map((mod, i) => (
        <div key={mod.id} className="v2-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 12, color: 'var(--green-dark, var(--green))' }}>
                {level.code} · {String(i + 1).padStart(2, '0')}
              </span>
              <strong style={{ fontSize: 16, color: 'var(--v2-card-fg, var(--ink))' }}>{mod.title}</strong>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>{mod.focus}</p>
          </div>

          <div>
            {mod.units.map((u, ui) => (
              <Link
                key={u.id}
                href={`/v2/trilha/${u.id}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderTop: ui > 0 ? '1px solid var(--line)' : 'none' }}
              >
                <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 11.5, color: 'var(--ink-soft)', width: 16, flexShrink: 0, textAlign: 'center' }}>{ui + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{u.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                    <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 10.5, color: 'var(--green-dark, var(--green))', background: 'var(--green-soft)', padding: '2px 7px', borderRadius: 6 }}>{u.target}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{u.context}</span>
                  </div>
                </div>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--green)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <p style={{ margin: '2px 0 8px', fontSize: 12.5, color: 'var(--ink-soft)', textAlign: 'center', lineHeight: 1.5 }}>
        🎯 Toque numa lição e a Cadi conduz o treino de 1–2 min.
      </p>
    </div>
  );
}

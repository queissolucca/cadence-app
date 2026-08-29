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

function CheckCircle() {
  return (
    <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--green)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
    </span>
  );
}

function PlayCircle({ filled }) {
  return (
    <span style={{ width: 26, height: 26, borderRadius: '50%', background: filled ? 'var(--green)' : 'transparent', border: filled ? 'none' : '1.5px solid var(--green)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill={filled ? '#fff' : 'var(--green)'} stroke="none"><path d="M8 5v14l11-7z" /></svg>
    </span>
  );
}

function LockCircle() {
  return (
    <span style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--line)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
    </span>
  );
}

// C2/C3/C4 — nível → módulos → lições, com progresso e desbloqueio sequencial:
// o módulo 2 só abre quando todas as lições do módulo 1 estiverem feitas, etc.
export function TrilhaView({ completedIds = [] }) {
  const [levelCode, setLevelCode] = useState('B1');
  const level = TRACK.find((l) => l.code === levelCode) || TRACK[0];
  const done = new Set(completedIds);

  const modComplete = (m) => m.units.every((u) => done.has(u.id));
  const allUnits = level.modules.flatMap((m) => m.units);
  const totalUnits = allUnits.length;
  const doneCount = allUnits.filter((u) => done.has(u.id)).length;
  const pct = totalUnits ? Math.round((doneCount / totalUnits) * 100) : 0;

  // Próxima lição = 1ª não feita no 1º módulo desbloqueado que ainda tem lição.
  let nextUnit = null;
  for (let i = 0; i < level.modules.length; i += 1) {
    const unlocked = i === 0 || level.modules.slice(0, i).every(modComplete);
    if (!unlocked) break;
    const u = level.modules[i].units.find((x) => !done.has(x.id));
    if (u) { nextUnit = { ...u, moduleTitle: level.modules[i].title }; break; }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {TRACK.map((l) => (
          <button key={l.code} type="button" onClick={() => setLevelCode(l.code)} style={tabStyle(l.code === levelCode)}>
            {l.code} · {l.name}
          </button>
        ))}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{level.blurb}</span>
          <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 12.5, color: 'var(--ink)' }}>{doneCount}/{totalUnits} lições</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', transition: 'width .3s ease' }} />
        </div>
      </div>

      {nextUnit && (
        <Link href={`/v2/trilha/${nextUnit.id}`} className="v2-card-green" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: '#16231C', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M8 5v14l11-7z" /></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 15 }}>{doneCount > 0 ? 'Continuar' : 'Começar'}</strong>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nextUnit.moduleTitle} · {nextUnit.title}</p>
          </div>
          <span style={{ fontSize: 20, opacity: 0.85, flexShrink: 0 }}>→</span>
        </Link>
      )}
      {!nextUnit && (
        <div className="v2-card" style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--ink-soft)' }}>
          🎉 Você completou o {level.code}! Bora pro próximo nível.
        </div>
      )}

      {level.modules.map((mod, i) => {
        const unlocked = i === 0 || level.modules.slice(0, i).every(modComplete);
        const modDone = mod.units.filter((u) => done.has(u.id)).length;
        return (
          <div key={mod.id} className="v2-card" style={{ padding: 0, overflow: 'hidden', opacity: unlocked ? 1 : 0.6 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 12, color: 'var(--green-dark, var(--green))' }}>{level.code} · {String(i + 1).padStart(2, '0')}</span>
                  <strong style={{ fontSize: 16, color: 'var(--v2-card-fg, var(--ink))' }}>{mod.title}</strong>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                  {unlocked ? mod.focus : `🔒 Complete o módulo ${String(i).padStart(2, '0')} pra desbloquear.`}
                </p>
              </div>
              {unlocked ? (
                <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 11.5, color: modDone === mod.units.length ? 'var(--green-dark, var(--green))' : 'var(--ink-soft)', flexShrink: 0, whiteSpace: 'nowrap' }}>{modDone}/{mod.units.length}</span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              )}
            </div>

            {unlocked && (
              <div>
                {mod.units.map((u, ui) => {
                  const isDone = done.has(u.id);
                  const isNext = nextUnit && u.id === nextUnit.id;
                  return (
                    <Link
                      key={u.id}
                      href={`/v2/trilha/${u.id}`}
                      style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderTop: ui > 0 ? '1px solid var(--line)' : 'none', background: isNext ? 'var(--green-soft)' : 'transparent' }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 11.5, color: 'var(--ink-soft)', width: 16, flexShrink: 0, textAlign: 'center' }}>{ui + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{u.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                          <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 10.5, color: 'var(--green-dark, var(--green))', background: 'var(--green-soft)', padding: '2px 7px', borderRadius: 6 }}>{u.target}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{u.context}</span>
                        </div>
                      </div>
                      {isDone ? <CheckCircle /> : <PlayCircle filled={isNext} />}
                    </Link>
                  );
                })}
              </div>
            )}

            {!unlocked && (
              <div>
                {mod.units.map((u, ui) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderTop: ui > 0 ? '1px solid var(--line)' : 'none' }}>
                    <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 11.5, color: 'var(--ink-soft)', width: 16, flexShrink: 0, textAlign: 'center' }}>{ui + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{u.title}</div>
                    </div>
                    <LockCircle />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <p style={{ margin: '2px 0 8px', fontSize: 12.5, color: 'var(--ink-soft)', textAlign: 'center', lineHeight: 1.5 }}>
        🎯 Toque numa lição e a Cadi conduz o treino de 1–2 min. Complete o módulo pra abrir o próximo.
      </p>
    </div>
  );
}

'use client';

import { useState } from 'react';

// HUD de gamificação (RPG) na Início: patente + barra de XP + missões da semana
// + botão de conquistas (pop-up). Recebe o objeto `game` já computado no server
// (lib/gamification.js). Deixa claro o que você é, quanto falta e o que ganha.
export function JourneyCard({ game }) {
  const [showBadges, setShowBadges] = useState(false);
  if (!game) return null;
  const { rank, level, next, pct, xp, xpToNext, quests, badges, badgesEarned } = game;

  return (
    <div className="v2-card-dark" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Patente + XP */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 34, lineHeight: 1 }} aria-hidden="true">{rank.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <strong style={{ fontSize: 16 }}>{rank.name}</strong>
            <span style={{ fontSize: 12, opacity: 0.75, fontFamily: 'var(--font-mono-v2, monospace)' }}>Nível {level} · {xp} XP</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.16)', overflow: 'hidden', marginTop: 6 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', transition: 'width .4s ease' }} />
          </div>
          <p style={{ margin: '5px 0 0', fontSize: 11.5, opacity: 0.75 }}>
            {next ? `Faltam ${xpToNext} XP pra virar ${next.name} ${next.icon}` : 'Patente máxima — você é uma Lenda! 👑'}
          </p>
        </div>
      </div>

      {/* Missões da semana */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 12 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}>Missões da semana</span>
        {quests.map((q) => (
          <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0, opacity: q.done ? 1 : 0.9 }}>{q.done ? '✅' : q.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5 }}>
                <span style={{ textDecoration: q.done ? 'line-through' : 'none', opacity: q.done ? 0.7 : 1 }}>{q.label}</span>
                <span style={{ opacity: 0.7, fontFamily: 'var(--font-mono-v2, monospace)', flexShrink: 0 }}>{q.progress}/{q.target}</span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.16)', overflow: 'hidden', marginTop: 4 }}>
                <div style={{ height: '100%', width: `${Math.round((q.progress / q.target) * 100)}%`, background: q.done ? 'var(--green)' : 'rgba(255,255,255,0.55)', transition: 'width .3s ease' }} />
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>+{q.reward}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowBadges(true)}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 12, padding: '10px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
      >
        🏆 Conquistas
        <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', opacity: 0.85 }}>{badgesEarned}/{badges.length}</span>
      </button>

      {showBadges && (
        <div
          onClick={() => setShowBadges(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 200 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="v2-card"
            style={{ width: '100%', maxWidth: 440, maxHeight: '82vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong style={{ fontSize: 17, color: 'var(--v2-card-fg, var(--ink))' }}>Conquistas</strong>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>{badgesEarned} de {badges.length} desbloqueadas</p>
              </div>
              <button type="button" onClick={() => setShowBadges(false)} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {badges.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4,
                    background: b.earned ? 'var(--green-soft)' : 'var(--v2-card-bg)',
                    border: `1px solid ${b.earned ? 'transparent' : 'var(--line)'}`,
                    borderRadius: 14, padding: '13px 8px',
                    opacity: b.earned ? 1 : 0.55,
                  }}
                >
                  <span style={{ fontSize: 26, lineHeight: 1, filter: b.earned ? 'none' : 'grayscale(1)' }} aria-hidden="true">{b.earned ? b.icon : '🔒'}</span>
                  <strong style={{ fontSize: 12.5, color: b.earned ? 'var(--green-dark, var(--green))' : 'var(--ink)' }}>{b.name}</strong>
                  <span style={{ fontSize: 10.5, color: 'var(--ink-soft)', lineHeight: 1.35 }}>{b.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

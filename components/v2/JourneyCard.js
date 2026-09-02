'use client';

import { useState } from 'react';

// HUD de gamificação (RPG) na Início — minimizado: mostra só a patente + barra de
// XP. Clicar na patente EXPANDE as missões da semana + conquistas. Recebe o
// objeto `game` já computado no server (lib/gamification.js).
export function JourneyCard({ game }) {
  const [expanded, setExpanded] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showRanks, setShowRanks] = useState(false);
  if (!game) return null;
  const { rank, level, next, pct, xp, xpToNext, quests, badges, badgesEarned, ranks = [] } = game;

  return (
    <div className="v2-card-dark" style={{ display: 'flex', flexDirection: 'column', gap: expanded ? 12 : 0, padding: '13px 15px' }}>
      {/* Patente + XP — clicar aqui expande as missões */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left', padding: 0 }}
      >
        <span style={{ fontSize: 27, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">{rank.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <strong style={{ fontSize: 15 }}>{rank.name}</strong>
            <span style={{ fontSize: 11.5, opacity: 0.75, fontFamily: 'var(--font-mono-v2, monospace)' }}>Nível {level} · {xp} XP</span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.16)', overflow: 'hidden', marginTop: 5 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', transition: 'width .4s ease' }} />
          </div>
        </div>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {expanded && (
        <>
          <p style={{ margin: '-4px 0 0', fontSize: 11.5, opacity: 0.75 }}>
            {next ? `Faltam ${xpToNext} XP pra virar ${next.name} ${next.icon}` : 'Patente máxima — você é Nativo! 👑'}
          </p>

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

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setShowBadges(true)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 11, padding: '9px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              🏆 Conquistas <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', opacity: 0.85 }}>{badgesEarned}/{badges.length}</span>
            </button>
            <button type="button" onClick={() => setShowRanks(true)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', borderRadius: 11, padding: '9px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              🏅 Patentes
            </button>
          </div>
        </>
      )}

      {showRanks && (
        <div onClick={() => setShowRanks(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 200 }}>
          <div onClick={(e) => e.stopPropagation()} className="v2-card" style={{ width: '100%', maxWidth: 400, maxHeight: '82vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong style={{ fontSize: 17, color: 'var(--v2-card-fg, var(--ink))' }}>Patentes</strong>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>Você tem <strong style={{ color: 'var(--green-dark, var(--green))' }}>{xp} XP</strong>. Do Aprendiz ao Nativo.</p>
              </div>
              <button type="button" onClick={() => setShowRanks(false)} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 4, flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ranks.map((r) => (
                <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 11, background: r.current ? 'var(--green-soft)' : 'var(--v2-card-bg)', border: `1px solid ${r.current ? 'transparent' : 'var(--line)'}`, borderRadius: 12, padding: '10px 12px', opacity: r.reached || r.current ? 1 : 0.6 }}>
                  <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, filter: r.reached ? 'none' : 'grayscale(0.6)' }} aria-hidden="true">{r.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 14, color: r.current ? 'var(--green-dark, var(--green))' : 'var(--ink)' }}>{r.name}</strong>
                    {r.current && <span style={{ fontSize: 11, color: 'var(--green-dark, var(--green))', fontWeight: 700 }}> · você está aqui</span>}
                  </div>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono-v2, monospace)', flexShrink: 0 }}>{r.min === 0 ? 'início' : `${r.min} XP`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showBadges && (
        <div onClick={() => setShowBadges(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 200 }}>
          <div onClick={(e) => e.stopPropagation()} className="v2-card" style={{ width: '100%', maxWidth: 440, maxHeight: '82vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                <div key={b.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4, background: b.earned ? 'var(--green-soft)' : 'var(--v2-card-bg)', border: `1px solid ${b.earned ? 'transparent' : 'var(--line)'}`, borderRadius: 14, padding: '13px 8px', opacity: b.earned ? 1 : 0.55 }}>
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

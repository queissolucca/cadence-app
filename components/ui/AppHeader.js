'use client';

import { useState } from 'react';
import { Pill } from './Pill';

export function AppHeader({ streak, streakShields = 0, avatarUrl, avatarInitial, onAvatarClick, className = '', ...props }) {
  const [showStreak, setShowStreak] = useState(false);
  const hasStreak = typeof streak === 'number';

  return (
    <header className={`v2-app-header ${className}`} {...props}>
      <span className="v2-logo">cadence</span>
      <div className="v2-header-right">
        {hasStreak && (
          <button
            type="button"
            onClick={() => setShowStreak(true)}
            aria-label="Ver sua sequência"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <Pill dotColor="var(--green)">
              🔥 {streak} {streak === 1 ? 'dia' : 'dias'}
              {streakShields > 0 && (
                <span title="1 falta por semana não zera sua sequência" style={{ marginLeft: 4 }} aria-label={`${streakShields} escudo(s) de proteção`}>
                  🛡
                </span>
              )}
            </Pill>
          </button>
        )}
        <button type="button" className="v2-avatar" onClick={onAvatarClick} aria-label="Perfil">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" />
          ) : (
            <span>{(avatarInitial || '?').charAt(0).toUpperCase()}</span>
          )}
        </button>
      </div>

      {showStreak && (
        <div
          onClick={() => setShowStreak(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 24, zIndex: 200 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="v2-card"
            style={{ maxWidth: 340, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
          >
            <span style={{ fontSize: 44, lineHeight: 1 }} aria-hidden="true">🔥</span>
            <p style={{ margin: 0, fontSize: 16, color: 'var(--v2-card-fg, var(--ink))', lineHeight: 1.55 }}>
              Você está a {streak} {streak === 1 ? 'dia' : 'dias'} aprendendo inglês! <strong>Isso sim é cadência de aprendizagem!</strong>
            </p>
            <button
              type="button"
              onClick={() => setShowStreak(false)}
              className="v2-card-dark"
              style={{ border: 'none', padding: '10px 22px', borderRadius: 999, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 2 }}
            >
              Bora continuar!
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

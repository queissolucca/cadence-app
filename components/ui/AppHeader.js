'use client';

import { Pill } from './Pill';

export function AppHeader({ streak, streakShields = 0, avatarUrl, avatarInitial, onAvatarClick, className = '', ...props }) {
  return (
    <header className={`v2-app-header ${className}`} {...props}>
      <span className="v2-logo">cadence</span>
      <div className="v2-header-right">
        {typeof streak === 'number' && (
          <Pill dotColor="var(--green)">
            🔥 {streak} {streak === 1 ? 'dia' : 'dias'}
            {streakShields > 0 && (
              <span title="1 falta por semana não zera sua sequência" style={{ marginLeft: 4 }} aria-label={`${streakShields} escudo(s) de proteção`}>
                🛡
              </span>
            )}
          </Pill>
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
    </header>
  );
}

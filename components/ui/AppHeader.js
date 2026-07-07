'use client';

import { Pill } from './Pill';

export function AppHeader({ streak, avatarUrl, avatarInitial, onAvatarClick, className = '', ...props }) {
  return (
    <header className={`v2-app-header ${className}`} {...props}>
      <span className="v2-logo">cadence</span>
      <div className="v2-header-right">
        {typeof streak === 'number' && (
          <Pill dot dotColor="var(--green)">{streak} sem.</Pill>
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

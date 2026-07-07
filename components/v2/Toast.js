'use client';

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 70,
        background: 'var(--v2-brand)', color: '#fff', fontSize: 13, fontWeight: 600,
        borderRadius: 999, padding: '9px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      }}
    >
      {message}
    </div>
  );
}

'use client';

// Indicador "digitando…" — 3 pontinhos com um movimentinho curto pra cima/baixo.
export function TypingDots({ label = 'Cady' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--ink-soft)', fontSize: 13, padding: '2px 0' }}>
      {label && <span>{label} está digitando</span>}
      <span className="cadyTyping" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <style jsx>{`
        .cadyTyping { display: inline-flex; gap: 4px; align-items: flex-end; }
        .cadyTyping i {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--ink-faint, var(--ink-soft));
          display: inline-block;
          animation: cadyBounce 1s infinite ease-in-out;
        }
        .cadyTyping i:nth-child(2) { animation-delay: 0.15s; }
        .cadyTyping i:nth-child(3) { animation-delay: 0.3s; }
        @keyframes cadyBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

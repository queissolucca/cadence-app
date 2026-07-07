'use client';

export function Pill({ children, dot = false, dotColor, className = '', ...props }) {
  return (
    <span className={`v2-pill ${className}`} {...props}>
      {dot && <span className="v2-pill-dot" style={dotColor ? { background: dotColor } : undefined} />}
      {children}
    </span>
  );
}

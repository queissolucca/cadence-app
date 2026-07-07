'use client';

export function ProgressBar({ value = 0, className = '', ...props }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`v2-progress-track ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div className="v2-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

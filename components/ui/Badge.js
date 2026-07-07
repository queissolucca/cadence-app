'use client';

const VARIANT_CLASS = {
  new: 'v2-badge-new',
  rev: 'v2-badge-rev',
  neutral: 'v2-badge-neutral',
  due: 'v2-badge-due',
};

export function Badge({ variant = 'neutral', children, className = '', ...props }) {
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.neutral;
  return (
    <span className={`v2-badge ${variantClass} ${className}`} {...props}>
      <span className="v2-badge-dot" />
      {children}
    </span>
  );
}

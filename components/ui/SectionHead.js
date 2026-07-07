'use client';

export function SectionHead({ title, right, className = '', ...props }) {
  return (
    <div className={`v2-section-head ${className}`} {...props}>
      <h2>{title}</h2>
      {right && <span className="v2-section-right">{right}</span>}
    </div>
  );
}

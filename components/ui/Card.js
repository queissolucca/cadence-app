'use client';

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`v2-card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardDark({ children, className = '', ...props }) {
  return (
    <div className={`v2-card-dark ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardGreen({ children, className = '', ...props }) {
  return (
    <div className={`v2-card-green ${className}`} {...props}>
      {children}
    </div>
  );
}

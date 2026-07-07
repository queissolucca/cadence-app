'use client';

// Genérico — extraído depois de repetir o mesmo padrão em ScenarioSwitcher
// e ScenarioTrail. Reusa em vez de duplicar de novo na aba Ajustes.
export function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'var(--v2-overlay)', display: 'flex', alignItems: 'flex-end', zIndex: 60 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--v2-card-bg)', color: 'var(--v2-card-fg)', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 420, margin: '0 auto', padding: 20, maxHeight: '75vh', overflowY: 'auto' }}
      >
        {title && (
          <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {title}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

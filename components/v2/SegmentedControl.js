'use client';

export function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, background: 'var(--v2-badge-neutral-bg)', borderRadius: 10, padding: 3 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, border: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              background: active ? 'var(--v2-brand)' : 'transparent',
              color: active ? '#fff' : 'var(--ink-soft)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';

// Header "← título" usado em toda sub-rota fora do shell principal
// (sem TabBar) — /praticar/writing, /praticar/speaking, /roleplay,
// /pontos-fracos, /antes-e-depois.
export function BackHeader({ title }) {
  const router = useRouter();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Voltar"
        style={{ border: 'none', background: 'none', fontSize: 22, color: 'var(--ink-soft)', cursor: 'pointer', padding: 0, lineHeight: 1 }}
      >
        ←
      </button>
      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{title}</span>
    </div>
  );
}

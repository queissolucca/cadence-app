'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// active_scenario_id só aceita UUIDs do catálogo scenarios (FK) — os
// extra_topics são ids de trilha do sistema antigo (ex: "trabalho_remoto"),
// não trocáveis por aqui. Aparecem só como nota informativa; trocar o tema
// extra continua sendo feito onde já existe hoje (painel de temas do app
// atual), sem duplicar esse controle.
export function ScenarioSwitcher({ scenarios, activeScenarioId, extraTopics }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const unlocked = scenarios.filter((s) => s.status !== 'locked');

  const handlePick = async (scenarioId) => {
    if (scenarioId === activeScenarioId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await fetch('/api/scenario/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      setOpen(false);
      router.refresh();
    } catch {
      // falha silenciosa — o usuário pode tentar de novo
    }
    setSwitching(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ border: 'none', background: 'none', color: 'var(--green-dark)', textDecoration: 'underline', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
      >
        trocar
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'var(--v2-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--v2-card-bg)', borderRadius: 22, width: '100%', maxWidth: 440, padding: 20, maxHeight: '70vh', overflowY: 'auto' }}
          >
            <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              escolher cenário de hoje
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {unlocked.map((s) => {
                const isActive = s.id === activeScenarioId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handlePick(s.id)}
                    disabled={switching}
                    style={{
                      textAlign: 'left', cursor: 'pointer',
                      border: isActive ? '1.5px solid var(--green)' : '1px solid var(--line)',
                      borderRadius: 14, padding: 12,
                      background: isActive ? 'var(--green-soft)' : 'var(--v2-card-bg)',
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: 14, color: 'var(--ink)' }}>{s.title}</strong>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{s.subtitle}</span>
                  </button>
                );
              })}
            </div>
            {extraTopics?.length > 0 && (
              <p style={{ marginTop: 16, fontSize: 12, color: 'var(--ink-soft)' }}>Temas extras selecionados: {extraTopics.join(', ')}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

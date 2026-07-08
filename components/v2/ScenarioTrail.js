'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Seleção livre entre os cenários desbloqueados (não é mais uma trilha
// sequencial obrigatória) — qualquer um com status !== 'locked' abre o
// detalhe e pode virar o cenário ativo do dia, independente de ordem ou de
// já estar "dominado". Bloqueados continuam só visuais, sem interação.
export function ScenarioTrail({ scenarios, activeScenarioId, recommendedId }) {
  const router = useRouter();
  const [openId, setOpenId] = useState(null);
  const [switching, setSwitching] = useState(false);
  const open = scenarios.find((s) => s.id === openId);

  const selectAndPractice = async () => {
    if (!open) return;
    setSwitching(true);
    try {
      if (open.id !== activeScenarioId) {
        await fetch('/api/scenario/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario_id: open.id }),
        });
      }
      router.push('/v2/praticar/writing');
    } catch {
      setSwitching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {scenarios.map((s) => {
        const isDone = s.status === 'done';
        const isLocked = s.status === 'locked';
        const isActive = s.id === activeScenarioId;
        const ratioPct = Math.min(100, Math.round((s.ratio || 0) * 100));

        return (
          <button
            key={s.id}
            type="button"
            disabled={isLocked}
            onClick={() => !isLocked && setOpenId(s.id)}
            className={isActive ? 'v2-card-dark' : 'v2-card'}
            style={{
              textAlign: 'left', border: isActive ? 'none' : '1px solid var(--line)',
              cursor: isLocked ? 'default' : 'pointer', opacity: isLocked ? 0.55 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 15 }}>{s.title}</strong>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: isActive ? 'rgba(255,255,255,0.75)' : 'var(--ink-soft)' }}>{s.subtitle}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                {isActive && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--green)' }}>ativo agora</span>
                )}
                {!isActive && s.id === recommendedId && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'var(--green)', borderRadius: 999, padding: '3px 8px' }}>
                    recomendado
                  </span>
                )}
              </div>
            </div>

            {!isLocked && (
              <>
                <div style={{ height: 6, borderRadius: 999, background: isActive ? 'rgba(255,255,255,0.15)' : 'var(--line)', overflow: 'hidden', marginTop: 10 }}>
                  <div style={{ height: '100%', width: `${ratioPct}%`, background: 'var(--green)' }} />
                </div>
                <span style={{ display: 'block', marginTop: 6, fontFamily: 'var(--font-mono-v2)', fontSize: 11, opacity: isActive ? 0.75 : 1, color: isActive ? undefined : 'var(--ink-soft)' }}>
                  {isDone ? 'dominado · ' : ''}{s.masteredCount}/{s.target_phrases} frases
                </span>
              </>
            )}
            {isLocked && (
              <span style={{ display: 'inline-block', marginTop: 10, fontFamily: 'var(--font-mono-v2)', fontSize: 11, color: 'var(--ink-soft)', border: '1px solid var(--line)', borderRadius: 999, padding: '3px 9px' }}>
                bloqueado
              </span>
            )}
          </button>
        );
      })}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenId(null)}
          style={{ position: 'fixed', inset: 0, background: 'var(--v2-overlay)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--v2-card-bg)', color: 'var(--v2-card-fg)', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 420, margin: '0 auto', padding: 20 }}
          >
            <strong style={{ display: 'block', fontSize: 17 }}>{open.title}</strong>
            <p style={{ margin: '4px 0 14px', fontSize: 13, color: 'var(--ink-soft)' }}>{open.subtitle}</p>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>
              {open.masteredCount} de {open.target_phrases} frases dominadas
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {(open.skill_tags || []).map((tag) => (
                <span key={tag} style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 11, border: '1px solid var(--line)', borderRadius: 999, padding: '4px 10px', color: 'var(--ink-soft)' }}>
                  {tag}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={selectAndPractice}
              disabled={switching}
              className="v2-card-dark"
              style={{ width: '100%', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            >
              {switching ? 'Um momento…' : open.id === activeScenarioId ? 'Praticar agora' : 'Usar este cenário e praticar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ScenarioTrail({ scenarios, recommendedId }) {
  const router = useRouter();
  const [openId, setOpenId] = useState(null);
  const open = scenarios.find((s) => s.id === openId);

  return (
    <div style={{ position: 'relative', paddingLeft: 22 }}>
      <div style={{ position: 'absolute', left: 6, top: 8, bottom: 8, width: 3, background: 'var(--line)', borderRadius: 2 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {scenarios.map((s) => {
          const isDone = s.status === 'done';
          const isCurrent = s.status === 'current';
          const isLocked = s.status === 'locked';
          const ratioPct = Math.min(100, Math.round((s.ratio || 0) * 100));

          return (
            <div key={s.id} style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute', left: -22, top: 6, width: 14, height: 14, borderRadius: '50%',
                  background: isDone ? 'var(--green)' : 'transparent',
                  border: isDone ? 'none' : `2px solid ${isCurrent ? 'var(--ink)' : 'var(--line)'}`,
                }}
              />
              {isCurrent ? (
                <button
                  type="button"
                  onClick={() => setOpenId(s.id)}
                  className="v2-card-dark"
                  style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }}
                >
                  <strong style={{ display: 'block', fontSize: 15 }}>{s.title}</strong>
                  <p style={{ margin: '2px 0 10px', fontSize: 13, opacity: 0.75 }}>{s.subtitle}</p>
                  <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${ratioPct}%`, background: 'var(--green)' }} />
                  </div>
                  <span style={{ display: 'block', marginTop: 6, fontFamily: 'var(--font-mono-v2)', fontSize: 11, opacity: 0.7 }}>
                    {s.masteredCount}/{s.target_phrases} frases
                  </span>
                </button>
              ) : (
                <div className="v2-card" style={{ opacity: isLocked ? 0.55 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: 15 }}>{s.title}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{s.subtitle}</p>
                    </div>
                    {s.id === recommendedId && (
                      <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'var(--green)', borderRadius: 999, padding: '3px 8px' }}>
                        recomendado
                      </span>
                    )}
                  </div>
                  {isDone ? (
                    <>
                      <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden', marginTop: 10 }}>
                        <div style={{ height: '100%', width: '100%', background: 'var(--green)' }} />
                      </div>
                      <span style={{ display: 'block', marginTop: 6, fontFamily: 'var(--font-mono-v2)', fontSize: 11, color: 'var(--green-dark)' }}>dominado</span>
                    </>
                  ) : (
                    <span style={{ display: 'inline-block', marginTop: 10, fontFamily: 'var(--font-mono-v2)', fontSize: 11, color: 'var(--ink-soft)', border: '1px solid var(--line)', borderRadius: 999, padding: '3px 9px' }}>
                      {s.id === recommendedId ? 'libera com 70% do atual' : 'bloqueado'}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenId(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,18,0.4)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 420, margin: '0 auto', padding: 20 }}
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
              onClick={() => router.push('/v2/praticar/writing')}
              className="v2-card-dark"
              style={{ width: '100%', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            >
              Praticar agora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

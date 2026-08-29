'use client';

import { useState } from 'react';

// Card da aba Início: alterna entre "Sua semana" (7 bolinhas) e "Seu mês"
// (mini-calendário achatado estilo iPhone). Clicar no título troca a visão.
// Os dias pintados vêm das sessões salvas no Supabase (mesma fonte do streak).
export function StreakCard({ weekDots, weekdayLabels, weekDoneCount, weeklyGoal, monthGrid, monthLabel, monthDoneCount }) {
  const [view, setView] = useState('week');
  const isMonth = view === 'month';

  return (
    <div className="v2-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setView(isMonth ? 'week' : 'month')}
          aria-label={isMonth ? 'Ver a semana' : 'Ver o mês'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          {isMonth ? 'Seu mês' : 'Sua semana'}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 16l-4-4 4-4M17 8l4 4-4 4M4 12h16" />
          </svg>
        </button>
        <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 12.5, color: 'var(--ink)' }}>
          {isMonth ? `${monthDoneCount} ${monthDoneCount === 1 ? 'dia' : 'dias'}` : `${weekDoneCount}/${weeklyGoal} dias`}
        </span>
      </div>

      {!isMonth && (
        <div style={{ display: 'flex', gap: 6 }}>
          {weekDots.map((d) => (
            <div
              key={d.key}
              title={d.key}
              style={{
                flex: 1, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
                background: d.done ? 'var(--green)' : 'transparent',
                color: d.done ? '#fff' : 'var(--ink)',
                border: d.done ? 'none' : `1.5px solid ${d.isToday ? 'var(--ink)' : 'var(--line)'}`,
              }}
            >
              {d.label}
            </div>
          ))}
        </div>
      )}

      {isMonth && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 8, textTransform: 'capitalize' }}>{monthLabel}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 5 }}>
            {weekdayLabels.map((l, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '0.02em' }}>{l}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {monthGrid.map((c) => (
              <div
                key={c.key}
                title={c.key}
                style={{
                  height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600,
                  background: c.done ? 'var(--green)' : 'transparent',
                  color: c.done ? '#fff' : 'var(--ink)',
                  opacity: c.inMonth ? 1 : 0.28,
                  border: !c.done && c.isToday ? '1.5px solid var(--ink)' : '1px solid transparent',
                }}
              >
                {c.day}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

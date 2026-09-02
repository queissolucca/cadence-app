'use client';

import { useMemo, useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Card da Início: o card INTEIRO é clicável e alterna entre "Sua semana" (7
// bolinhas) e "Seu mês" (mini-calendário achatado estilo iPhone). No mês dá pra
// navegar de 2026 a 2027 pelas setas (que não disparam a troca de visão). Os
// dias pintados vêm das sessões salvas no Supabase.
export function StreakCard({
  weekDots, weekdayLabels, weekDoneCount, weeklyGoal,
  doneDays, todayKey, year, month,
  minYear = 2026, minMonth = 1, maxYear = 2027, maxMonth = 12,
}) {
  const [view, setView] = useState('week');
  const [vy, setVy] = useState(year);
  const [vm, setVm] = useState(month);
  const isMonth = view === 'month';
  const doneSet = useMemo(() => new Set(doneDays || []), [doneDays]);

  const grid = useMemo(() => {
    const first = new Date(vy, vm - 1, 1);
    const mondayIndex = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(vy, vm, 0).getDate();
    const totalCells = Math.ceil((mondayIndex + daysInMonth) / 7) * 7;
    return Array.from({ length: totalCells }, (_, i) => {
      const d = new Date(vy, vm - 1, 1 - mondayIndex + i);
      const key = keyOf(d);
      return { key, day: d.getDate(), inMonth: d.getMonth() === vm - 1, done: doneSet.has(key), isToday: key === todayKey };
    });
  }, [vy, vm, doneSet, todayKey]);

  const monthLabel = useMemo(() => new Date(vy, vm - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), [vy, vm]);
  const monthDoneCount = grid.filter((c) => c.inMonth && c.done).length;

  const ym = vy * 12 + (vm - 1);
  const canPrev = ym > minYear * 12 + (minMonth - 1);
  const canNext = ym < maxYear * 12 + (maxMonth - 1);
  const shift = (delta) => {
    const t = ym + delta;
    setVy(Math.floor(t / 12));
    setVm((t % 12) + 1);
  };

  const navBtn = (enabled) => ({
    background: 'none', border: 'none', padding: 4, cursor: enabled ? 'pointer' : 'default',
    color: 'var(--ink)', opacity: enabled ? 0.8 : 0.25, display: 'grid', placeItems: 'center',
  });

  return (
    <div className="v2-card" onClick={() => setView(isMonth ? 'week' : 'month')} style={{ cursor: 'pointer', ...(isMonth ? {} : { paddingTop: 12, paddingBottom: 12 }) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMonth ? 12 : 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {isMonth ? 'Seu mês' : 'Sua semana'}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />
          </svg>
        </span>
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
                flex: 1, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', fontSize: 12.5, fontWeight: 700,
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); if (canPrev) shift(-1); }} disabled={!canPrev} aria-label="Mês anterior" style={navBtn(canPrev)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600, textTransform: 'capitalize' }}>{monthLabel}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); if (canNext) shift(1); }} disabled={!canNext} aria-label="Próximo mês" style={navBtn(canNext)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 5 }}>
            {weekdayLabels.map((l, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--ink-soft)' }}>{l}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {grid.map((c) => (
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

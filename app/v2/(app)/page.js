import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { dayKeySP, weekStartSP, addDays, todayKeySP } from '../../../lib/dates';
import { AppHeader } from '../../../components/ui';
import { StreakCard } from '../../../components/v2/StreakCard';

const WEEKDAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']; // segunda -> domingo

function getGreeting() {
  return 'Bora conversar?';
}

// Home enxuta: streak da semana/mês + o atalho pra conversa. Duas queries
// baratas ao Supabase, nada de IA no load — pinta na hora.
export default async function HojePageV2() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const todayKey = todayKeySP();

  // Mês atual em America/Sao_Paulo.
  const spYM = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(now);
  const [my, mm] = spYM.split('-').map(Number);
  const monthPrefix = `${my}-${String(mm).padStart(2, '0')}`;
  const firstOfMonth = new Date(my, mm - 1, 1, 12); // meio-dia evita virada de fuso
  const monthLabel = firstOfMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  const mondayIndex = (firstOfMonth.getDay() + 6) % 7; // segunda = 0
  const daysInMonth = new Date(my, mm, 0).getDate();
  const totalCells = Math.ceil((mondayIndex + daysInMonth) / 7) * 7;
  const gridStart = addDays(firstOfMonth, -mondayIndex);

  const weekStart = weekStartSP(now);
  const rangeStart = addDays(gridStart, -1);
  const rangeEnd = addDays(gridStart, totalCells + 1);

  const [profileRes, sessionsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url, streak_count, weekly_cadence_target')
      .eq('id', user.id)
      .single(),
    supabase
      .from('sessions')
      .select('started_at')
      .eq('user_id', user.id)
      .gte('started_at', rangeStart.toISOString())
      .lte('started_at', rangeEnd.toISOString()),
  ]);

  const profile = profileRes.data;
  const doneDays = new Set((sessionsRes.data || []).map((s) => dayKeySP(new Date(s.started_at))));

  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const key = dayKeySP(date);
    return { key, label: WEEKDAY_LABELS[i], done: doneDays.has(key), isToday: key === todayKey };
  });
  const weekDoneCount = weekDots.filter((d) => d.done).length;

  const monthGrid = Array.from({ length: totalCells }, (_, i) => {
    const date = addDays(gridStart, i);
    const key = dayKeySP(date);
    return { key, day: Number(key.slice(8, 10)), inMonth: key.slice(0, 7) === monthPrefix, done: doneDays.has(key), isToday: key === todayKey };
  });
  const monthDoneCount = monthGrid.filter((c) => c.inMonth && c.done).length;

  const weeklyGoal = profile?.weekly_cadence_target || 5;
  const streakCount = profile?.streak_count || 0;

  // Recorde de streak — best-effort: a coluna streak_max pode ainda não existir
  // (migration 0013). Se não existir, cai pro streak atual sem quebrar a página.
  let streakMax = streakCount;
  const { data: maxRow } = await supabase.from('profiles').select('streak_max').eq('id', user.id).maybeSingle();
  if (maxRow && typeof maxRow.streak_max === 'number') streakMax = Math.max(streakMax, maxRow.streak_max);

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
    : null;

  return (
    <>
      <div className="mobile-only">
        <AppHeader
          streak={streakCount}
          avatarUrl={profile?.avatar_url}
          avatarInitial={profile?.full_name || user.email}
          profile={{ fullName: profile?.full_name || '', email: user.email, memberSince, streakMax }}
        />
        <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{getGreeting()}</p>
      </div>
      <div className="desktop-only">
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', margin: 0, color: 'var(--ink)' }}>{getGreeting()}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-soft)' }}>
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })}
        </p>
      </div>

      <StreakCard
        weekDots={weekDots}
        weekdayLabels={WEEKDAY_LABELS}
        weekDoneCount={weekDoneCount}
        weeklyGoal={weeklyGoal}
        monthGrid={monthGrid}
        monthLabel={monthLabel}
        monthDoneCount={monthDoneCount}
      />

      <Link href="/v2/conversar" style={{ textDecoration: 'none' }}>
        <div className="v2-card-green" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--ink)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 18 }}>Conversar em inglês</strong>
            <p style={{ margin: '3px 0 0', fontSize: 13.5, opacity: 0.85 }}>Fale de verdade com seu coach — ele corrige na hora.</p>
          </div>
          <span style={{ fontSize: 22, opacity: 0.85, flexShrink: 0 }}>→</span>
        </div>
      </Link>
    </>
  );
}

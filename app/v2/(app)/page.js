import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { dayKeySP, weekStartSP, addDays, todayKeySP } from '../../../lib/dates';
import { AppHeader } from '../../../components/ui';
import { StreakCard } from '../../../components/v2/StreakCard';

const WEEKDAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']; // segunda -> domingo

function getGreeting() {
  return 'Bora conversar?';
}

export default async function HojePageV2() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const todayKey = todayKeySP();
  const spYM = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(now);
  const [curYear, curMonth] = spYM.split('-').map(Number);
  const weekStart = weekStartSP(now);

  const [profileRes, sessionsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url, streak_count, weekly_cadence_target')
      .eq('id', user.id)
      .single(),
    // Cobre 2026 e 2027 pro calendário navegável — só volta os DIAS com sessão,
    // então o dado é minúsculo (um Set de datas).
    supabase
      .from('sessions')
      .select('started_at')
      .eq('user_id', user.id)
      .gte('started_at', '2026-01-01T00:00:00Z')
      .lte('started_at', '2028-01-01T00:00:00Z'),
  ]);

  const profile = profileRes.data;
  const doneDays = Array.from(new Set((sessionsRes.data || []).map((s) => dayKeySP(new Date(s.started_at)))));
  const doneSet = new Set(doneDays);

  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const key = dayKeySP(date);
    return { key, label: WEEKDAY_LABELS[i], done: doneSet.has(key), isToday: key === todayKey };
  });
  const weekDoneCount = weekDots.filter((d) => d.done).length;

  const weeklyGoal = profile?.weekly_cadence_target || 5;
  const streakCount = profile?.streak_count || 0;

  // Recorde de streak (best-effort — coluna streak_max pode não existir ainda).
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
        doneDays={doneDays}
        todayKey={todayKey}
        year={curYear}
        month={curMonth}
      />

      <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px', margin: '2px 0 0', color: 'var(--ink)' }}>Como você quer treinar hoje?</h2>
      <div className="web-grid-2">
        <Link href="/v2/trilha" style={{ textDecoration: 'none' }}>
          <div className="v2-card-green" style={{ display: 'flex', alignItems: 'center', gap: 14, height: '100%' }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: '#16231C', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: 16 }}>Trilha de aprendizagem</strong>
              <p style={{ margin: '3px 0 0', fontSize: 13, opacity: 0.85 }}>Do intermediário ao avançado, lições de 1-2min</p>
            </div>
            <span style={{ fontSize: 20, opacity: 0.85, flexShrink: 0 }}>→</span>
          </div>
        </Link>

        <Link href="/v2/conversar" style={{ textDecoration: 'none' }}>
          <div className="v2-card-dark" style={{ display: 'flex', alignItems: 'center', gap: 14, height: '100%' }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: 'var(--green)', color: '#16231C', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: 16 }}>Conversa aberta</strong>
              <p style={{ margin: '3px 0 0', fontSize: 13, opacity: 0.85 }}>Converse agora à vontade com a Cady!</p>
            </div>
            <span style={{ fontSize: 20, opacity: 0.85, flexShrink: 0 }}>→</span>
          </div>
        </Link>
      </div>
    </>
  );
}

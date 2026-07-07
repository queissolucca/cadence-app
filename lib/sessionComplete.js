import { completeSessionToday, maybeAwardShield } from './streak';
import { dayKeySP, weekStartSP, weekEndSP } from './dates';

// Extraído de app/api/session/complete/route.js pra ser chamado tanto pela
// rota (client-side, todo fluxo de PracticeSession) quanto server-to-server
// por outras rotas que fecham uma sessão sem precisar de um round-trip HTTP
// próprio (ex: /api/before-after, Etapa 10).
export async function completeSession(supabase, user, { kind, mode, duration_seconds, items_total, items_correct }) {
  const now = new Date();

  await supabase.from('sessions').insert({
    user_id: user.id,
    kind,
    mode: mode || null,
    started_at: now.toISOString(),
    finished_at: now.toISOString(),
    duration_seconds: duration_seconds || 0,
    items_total: items_total || 0,
    items_correct: items_correct || 0,
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_count, streak_last_day, streak_shields, weekly_cadence_target')
    .eq('id', user.id)
    .single();

  const streakResult = completeSessionToday(
    {
      streakCount: profile?.streak_count || 0,
      streakLastDay: profile?.streak_last_day,
      streakShields: profile?.streak_shields || 0,
    },
    now,
  );

  const weekStart = weekStartSP(now).toISOString();
  const weekEnd = weekEndSP(now).toISOString();
  const { data: weekSessions } = await supabase
    .from('sessions')
    .select('started_at')
    .eq('user_id', user.id)
    .gte('started_at', weekStart)
    .lte('started_at', weekEnd);

  const weekDaysDone = new Set((weekSessions || []).map((s) => dayKeySP(new Date(s.started_at)))).size;
  const weeklyGoal = profile?.weekly_cadence_target || 5;
  const shieldResult = maybeAwardShield({ streakShields: streakResult.streakShields }, weekDaysDone, weeklyGoal);

  await supabase
    .from('profiles')
    .update({
      streak_count: streakResult.streakCount,
      streak_last_day: streakResult.streakLastDay,
      streak_shields: shieldResult.streakShields,
    })
    .eq('id', user.id);

  return {
    streak_count: streakResult.streakCount,
    week_days_done: weekDaysDone,
    weekly_goal: weeklyGoal,
    shield_earned: shieldResult.awarded,
  };
}

import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { completeSessionToday, maybeAwardShield } from '../../../../lib/streak';
import { dayKeySP, weekStartSP, weekEndSP } from '../../../../lib/dates';

const VALID_KINDS = ['daily', 'weak_training', 'roleplay', 'baseline'];
const VALID_MODES = ['writing', 'speaking', 'mixed'];

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { kind, mode, duration_seconds, items_total, items_correct } = body;
  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  if (mode && !VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: 'invalid_mode' }, { status: 400 });
  }

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

  return NextResponse.json({
    streak_count: streakResult.streakCount,
    week_days_done: weekDaysDone,
    weekly_goal: weeklyGoal,
    shield_earned: shieldResult.awarded,
  });
}

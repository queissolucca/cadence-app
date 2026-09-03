import { createClient } from '../../../../lib/supabase/server';
import { SectionHead } from '../../../../components/ui';
import { AjustesClient } from '../../../../components/v2/AjustesClient';
import { computeGamification } from '../../../../lib/gamification';
import { streakFromDayKeys } from '../../../../lib/streak';
import { dayKeySP, weekStartSP, addDays, todayKeySP } from '../../../../lib/dates';

// Aba Perfil (antiga Ajustes): a gamificação (patente/XP/missões) mora aqui + o
// perfil e as configurações.
export default async function AjustesPageV2() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, weekly_cadence_target, theme')
    .eq('id', user.id)
    .single();

  // ---- Gamificação (derivada dos dados; best-effort se tabelas faltarem) ----
  const now = new Date();
  const todayKey = todayKeySP();
  const weekStart = weekStartSP(now);
  const weekKeys = new Set(Array.from({ length: 7 }, (_, i) => dayKeySP(addDays(weekStart, i))));

  const { data: sessions } = await supabase
    .from('sessions')
    .select('started_at')
    .eq('user_id', user.id)
    .gte('started_at', new Date(Date.now() - 120 * 86400000).toISOString());
  const sessAll = sessions || [];
  const doneSet = new Set(sessAll.map((s) => dayKeySP(new Date(s.started_at))));
  const streak = streakFromDayKeys(doneSet, todayKey);
  const sessionsThisWeek = sessAll.filter((s) => weekKeys.has(dayKeySP(new Date(s.started_at)))).length;
  const daysThisWeek = Array.from(weekKeys).filter((k) => doneSet.has(k)).length;

  let completedIds = [];
  let unitsThisWeek = 0;
  const up = await supabase.from('unit_progress').select('unit_id, completed_at').eq('user_id', user.id);
  if (up.data) {
    completedIds = up.data.map((r) => r.unit_id);
    unitsThisWeek = up.data.filter((r) => r.completed_at && weekKeys.has(dayKeySP(new Date(r.completed_at)))).length;
  }
  let cardsLearned = 0;
  const cl = await supabase.from('review_saved').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'learned');
  if (typeof cl.count === 'number') cardsLearned = cl.count;

  const game = computeGamification({
    completedIds,
    sessionsTotal: sessAll.length,
    sessionsThisWeek,
    cardsLearned,
    streak,
    unitsThisWeek,
    daysThisWeek,
    weeklyGoal: profile?.weekly_cadence_target || 5,
  });

  return (
    <div className="web-narrow" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead title="Perfil" />
      <AjustesClient profile={profile} email={user.email} game={game} />
    </div>
  );
}

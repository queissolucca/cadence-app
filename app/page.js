import { createClient } from '../lib/supabase/server';
import { computeWeekActivity, computeCadenceWeeks, computeCadenceStreak } from '../lib/week';
import CadenceApp from './CadenceApp';
import LoginScreen from './LoginScreen';
import Diagnostic from './Diagnostic';

export default async function Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginScreen />;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('weekly_cadence_target, current_track, current_stage, diagnostic_completed, correction_timing, correction_depth')
    .eq('id', user.id)
    .single();

  if (!profile?.diagnostic_completed) {
    return <Diagnostic />;
  }

  const sinceDate = new Date(Date.now() - 400 * 86400000).toISOString();

  const [{ data: reviewItems }, { data: attempts }, { data: skillProgress }, { data: stageCompletions }, { data: themeSelection }, { data: snapshots }] = await Promise.all([
    supabase
      .from('review_items')
      .select('*')
      .eq('user_id', user.id)
      .order('next_review_at', { ascending: true })
      .limit(300),
    supabase
      .from('exercise_attempts')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', sinceDate),
    supabase
      .from('skill_progress')
      .select('skill, precisao, naturalidade, vocabulario, fluencia')
      .eq('user_id', user.id),
    supabase
      .from('stage_completions')
      .select('track, stage')
      .eq('user_id', user.id),
    supabase
      .from('user_theme_selection')
      .select('track_id')
      .eq('user_id', user.id)
      .order('priority', { ascending: true }),
    supabase
      .from('progress_snapshots')
      .select('id, response_text, errors_then, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ]);

  const skillProgressMap = { writing: {}, speaking: {} };
  (skillProgress || []).forEach((row) => {
    skillProgressMap[row.skill] = row;
  });

  const cadenceWeeks = computeCadenceWeeks(attempts, profile.weekly_cadence_target);

  // §7 — antes/depois: só fica "devido" a cada ~4 semanas (28 dias) desde o
  // último snapshot, ou se nunca houve nenhum.
  const SNAPSHOT_INTERVAL_DAYS = 28;
  const oldestSnapshot = snapshots?.[0] || null;
  const newestSnapshot = snapshots?.length ? snapshots[snapshots.length - 1] : null;
  const daysSinceLast = newestSnapshot ? (Date.now() - new Date(newestSnapshot.created_at).getTime()) / 86400000 : Infinity;
  const snapshotDue = daysSinceLast >= SNAPSHOT_INTERVAL_DAYS;

  return (
    <CadenceApp
      user={user}
      initialLedger={reviewItems || []}
      initialCadenceWeeks={cadenceWeeks}
      initialCadenceStreak={computeCadenceStreak(cadenceWeeks)}
      initialWeekDays={computeWeekActivity(attempts)}
      initialSkillProgress={skillProgressMap}
      initialProfile={profile}
      initialStageCompletions={stageCompletions || []}
      initialThemeSelection={(themeSelection || []).map((row) => row.track_id)}
      initialSnapshotCount={snapshots?.length || 0}
      initialSnapshotDue={snapshotDue}
      initialOldestSnapshot={oldestSnapshot}
      initialNewestSnapshot={newestSnapshot}
    />
  );
}

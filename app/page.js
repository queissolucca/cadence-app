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
    .select('weekly_cadence_target, current_track, current_stage, diagnostic_completed')
    .eq('id', user.id)
    .single();

  if (!profile?.diagnostic_completed) {
    return <Diagnostic />;
  }

  const sinceDate = new Date(Date.now() - 400 * 86400000).toISOString();

  const [{ data: reviewItems }, { data: attempts }, { data: skillProgress }, { data: stageCompletions }] = await Promise.all([
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
  ]);

  const skillProgressMap = { writing: {}, speaking: {} };
  (skillProgress || []).forEach((row) => {
    skillProgressMap[row.skill] = row;
  });

  const cadenceWeeks = computeCadenceWeeks(attempts, profile.weekly_cadence_target);

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
    />
  );
}

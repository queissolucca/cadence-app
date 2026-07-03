import { createClient } from '../lib/supabase/server';
import { computeStreak, computeWeekActivity } from '../lib/week';
import CadenceApp from './CadenceApp';
import LoginScreen from './LoginScreen';

export default async function Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginScreen />;
  }

  const sinceDate = new Date(Date.now() - 400 * 86400000).toISOString();

  const [{ data: reviewItems }, { data: attempts }, { data: skillProgress }] = await Promise.all([
    supabase
      .from('review_items')
      .select('*')
      .eq('user_id', user.id)
      .order('next_review_at', { ascending: true })
      .limit(200),
    supabase
      .from('exercise_attempts')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', sinceDate),
    supabase
      .from('skill_progress')
      .select('skill, cefr_level, total_attempts, correct_streak')
      .eq('user_id', user.id),
  ]);

  const cefrLevels = { writing: 'A1', speaking: 'A1' };
  (skillProgress || []).forEach((row) => {
    cefrLevels[row.skill] = row.cefr_level;
  });

  return (
    <CadenceApp
      user={user}
      initialReviewItems={reviewItems || []}
      initialStreak={computeStreak(attempts)}
      initialWeekDays={computeWeekActivity(attempts)}
      initialCefrLevels={cefrLevels}
    />
  );
}

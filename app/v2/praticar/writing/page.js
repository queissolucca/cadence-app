import { createClient } from '../../../../lib/supabase/server';
import { getOrCreateDailyContent } from '../../../../lib/dailyContent';
import { buildReviewPrompt } from '../../../../lib/reviewPrompt';
import { PracticeSession } from '../../../../components/v2/PracticeSession';

export default async function PraticarWritingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('correction_timing, correction_depth, voice_accent, audio_speed, pronunciation_strictness')
    .eq('id', user.id)
    .single();

  const nowIso = new Date().toISOString();
  const { data: dueItems } = await supabase
    .from('review_items')
    .select('id, pattern, content')
    .eq('user_id', user.id)
    .eq('skill', 'writing')
    .eq('mastered', false)
    .lte('next_review_at', nowIso)
    .order('next_review_at', { ascending: true });

  let content;
  try {
    content = await getOrCreateDailyContent(supabase, user);
  } catch {
    content = { exercises: { writing: [] } };
  }
  const newExercises = content.exercises?.writing || [];

  const queue = [
    ...(dueItems || []).map((item) => ({
      kind: 'review',
      phraseId: item.id,
      promptPt: buildReviewPrompt(item),
      tip: item.content?.dica || '',
      categoria: item.content?.categoria || item.pattern,
      formaNatural: item.content?.forma_natural || '',
      expectedFocus: item.content?.categoria || item.pattern,
      skillTags: item.content?.skill_tags || [],
    })),
    ...newExercises.map((ex) => ({
      kind: 'new',
      promptPt: ex.prompt_pt,
      expectedFocus: ex.expected_focus,
      skillTags: ex.skill_tags || [],
    })),
  ];

  return (
    <PracticeSession
      mode="writing"
      initialQueue={queue}
      profile={profile}
      otherModeHref="/v2/praticar/speaking"
      otherModeLabel="Speaking"
    />
  );
}

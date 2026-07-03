import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { gradeAnswer } from '../../../../lib/grade';
import { computeReviewOutcome, nextReviewDate } from '../../../../lib/srs';
import { nextCefrLevel } from '../../../../lib/cefr';

const SKILL_BY_MODE = { write: 'writing', speak: 'speaking' };

// Avanço de nível: desempenho consistente, não um exercício isolado —
// exige 5 tentativas seguidas sem "rework" no nível atual.
const LEVEL_UP_STREAK = 5;

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

  const { mode, userText, scenario, memory, reviewItemId } = body;
  if (!userText || !scenario) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const skill = SKILL_BY_MODE[mode] || 'writing';
  const feedback = await gradeAnswer({ mode, userText, scenario, memory });
  const correct = feedback.verdict !== 'rework';

  const { data: attempt } = await supabase
    .from('exercise_attempts')
    .insert({
      user_id: user.id,
      skill,
      task_type: reviewItemId ? 'review' : 'ppp_practice',
      task: { label: scenario.label, context: scenario.context, askPt: scenario.askPt },
      user_input: userText,
      feedback,
      verdict: feedback.verdict,
      review_item_id: reviewItemId || null,
    })
    .select('id')
    .single();

  let reviewItem = null;

  if (reviewItemId) {
    // Revisão de um item existente: aplica a progressão 0/1/7/30 do SRS.
    const { data: existing } = await supabase
      .from('review_items')
      .select('*')
      .eq('id', reviewItemId)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      const outcome = computeReviewOutcome(existing.stage, correct);
      const dueAt = nextReviewDate(outcome.dueInDays);

      const { data: updated } = await supabase
        .from('review_items')
        .update({
          stage: outcome.stage,
          mastered: outcome.mastered,
          mastered_at: outcome.mastered ? new Date().toISOString() : existing.mastered_at,
          next_review_at: dueAt.toISOString(),
          times_seen: existing.times_seen + 1,
          times_correct: existing.times_correct + (correct ? 1 : 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewItemId)
        .select('*')
        .single();

      await supabase.from('review_events').insert({
        review_item_id: reviewItemId,
        user_id: user.id,
        result: correct ? 'correct' : 'incorrect',
        stage_before: existing.stage,
        stage_after: outcome.stage,
      });

      reviewItem = updated;
    }
  } else if (!correct) {
    // Erro novo detectado numa tarefa livre: entra no SRS já no estágio 0.
    const { data: created } = await supabase
      .from('review_items')
      .insert({
        user_id: user.id,
        type: 'error',
        content: {
          skill,
          label: scenario.label,
          context: scenario.context,
          askPt: scenario.askPt,
          target: userText,
          correction: feedback.natural,
          note: feedback.why,
        },
        stage: 0,
        next_review_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    reviewItem = created;
  }

  const { data: progressRow } = await supabase
    .from('skill_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('skill', skill)
    .maybeSingle();

  const currentLevel = progressRow?.cefr_level || 'A1';
  const streakAfter = correct ? (progressRow?.correct_streak || 0) + 1 : 0;

  let levelAfter = currentLevel;
  let leveledUp = false;
  let streakToSave = streakAfter;
  if (streakAfter >= LEVEL_UP_STREAK) {
    levelAfter = nextCefrLevel(currentLevel);
    leveledUp = levelAfter !== currentLevel;
    streakToSave = 0; // reinicia a contagem no novo nível
  }

  await supabase.from('skill_progress').upsert(
    {
      user_id: user.id,
      skill,
      cefr_level: levelAfter,
      total_attempts: (progressRow?.total_attempts || 0) + 1,
      correct_streak: streakToSave,
      last_attempt_at: new Date().toISOString(),
      ...(leveledUp ? { leveled_up_at: new Date().toISOString() } : {}),
    },
    { onConflict: 'user_id,skill' },
  );

  return NextResponse.json({
    feedback,
    reviewItem,
    attemptId: attempt?.id || null,
    levelUp: leveledUp ? { skill, level: levelAfter } : null,
  });
}

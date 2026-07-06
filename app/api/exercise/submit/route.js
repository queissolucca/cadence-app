import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { correctAnswer, generateMasteryMessage } from '../../../../lib/correct';
import { computeReviewOutcome, nextReviewDate } from '../../../../lib/srs';
import { clampAxis } from '../../../../lib/patents';

export const maxDuration = 30;

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

  const { skill, task, userText, restriction, reviewItemId, isBoss, track, stage } = body;
  if (!userText || !task || (skill !== 'writing' && skill !== 'speaking')) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  // Perfil de erros comprimido: só os top-5 itens ativos dessa skill (§6.2).
  const { data: activeItems } = await supabase
    .from('review_items')
    .select('id, pattern, skill, times_seen, times_correct')
    .eq('user_id', user.id)
    .eq('skill', skill)
    .eq('mastered', false)
    .not('pattern', 'is', null)
    .order('next_review_at', { ascending: true })
    .limit(5);

  const errorProfile = (activeItems || []).map((it) => ({
    id: it.id,
    pattern: it.pattern,
    skill: it.skill,
    taxa_erro_recente: it.times_seen > 0 ? 1 - it.times_correct / it.times_seen : 1,
  }));

  // §5: profundidade de correção é preferência do usuário — lida do servidor,
  // nunca confiada ao payload do cliente.
  const { data: prefRow } = await supabase
    .from('profiles')
    .select('correction_depth')
    .eq('id', user.id)
    .maybeSingle();
  const depth = prefRow?.correction_depth || 'explain_always';

  const mode = isBoss ? 'rubrica' : 'quick';
  const correction = await correctAnswer({ skill, task, userText, restriction, errorProfile, mode, depth });
  const correct = correction.veredito === 'correto';

  const { data: attempt } = await supabase
    .from('exercise_attempts')
    .insert({
      user_id: user.id,
      skill,
      task_type: isBoss ? 'boss' : reviewItemId ? 'review' : 'ppp_practice',
      task: { label: task.label, context: task.context, askPt: task.askPt, restriction: restriction || null },
      user_input: userText,
      feedback: correction,
      verdict: correction.veredito,
      review_item_id: reviewItemId || null,
      rubrica_delta: correction.rubrica_delta,
      restricao_cumprida: correction.restricao_cumprida,
    })
    .select('id')
    .single();

  let reviewItem = null;
  let masteryEvent = null;

  if (reviewItemId) {
    // Revisão de um item existente do ledger: aplica a progressão 0/1/7/30.
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

      // Feedback nomeado (§1): só na transição active→mastered, nunca a
      // cada acerto isolado.
      if (!existing.mastered && outcome.mastered) {
        const content = existing.content || {};
        const message = await generateMasteryMessage({
          pattern: existing.pattern || content.categoria || 'padrão',
          categoria: content.categoria || '',
          formaNatural: content.forma_natural || '',
          timesSeen: updated.times_seen,
          timesCorrect: updated.times_correct,
        });

        const { data: insertedEvent } = await supabase
          .from('mastery_events')
          .insert({
            user_id: user.id,
            review_item_id: reviewItemId,
            message: message.mensagem,
            context: { pattern: existing.pattern, categoria: content.categoria, times_seen: updated.times_seen, times_correct: updated.times_correct },
          })
          .select('*')
          .single();

        masteryEvent = insertedEvent;

        // §8 — recuperação ativa: a cada N (padrão 5) erros dominados no
        // total, este evento de mastery pede pro aluno tentar explicar a
        // regra ANTES de ver a explicação real — só nesse a cada N, nunca
        // sempre (senão vira fricção o tempo todo).
        const RECALL_EVERY_N_MASTERED = 5;
        const { count: masteredTotal } = await supabase
          .from('review_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('mastered', true);

        if (masteryEvent && masteredTotal && masteredTotal % RECALL_EVERY_N_MASTERED === 0) {
          masteryEvent.recall = {
            reviewItemId,
            pattern: existing.pattern || '',
            porque: content.porque || '',
            formaNatural: content.forma_natural || '',
          };
        }
      }
    }
  } else if (correction.erro_ledger?.acao === 'atualizar' && correction.erro_ledger.id) {
    // Erro numa tarefa livre bate com um padrão já existente — reforça o
    // contador; a revisão espaçada de verdade acontece quando ele reaparece.
    const { data: existing } = await supabase
      .from('review_items')
      .select('*')
      .eq('id', correction.erro_ledger.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { data: updated } = await supabase
        .from('review_items')
        .update({
          times_seen: existing.times_seen + 1,
          times_correct: existing.times_correct + (correct ? 1 : 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      reviewItem = updated;
    }
  } else if (correction.erro_ledger?.acao === 'criar' && correction.erro_ledger.pattern) {
    // Padrão novo — upsert por (user_id, skill, pattern) deduplica automático.
    const { data: created } = await supabase
      .from('review_items')
      .upsert(
        {
          user_id: user.id,
          type: 'error',
          skill,
          pattern: correction.erro_ledger.pattern,
          content: {
            categoria: correction.erro_ledger.categoria,
            exemplos_do_usuario: [userText],
            forma_natural: correction.erro_ledger.forma_natural,
            porque: correction.erro_ledger.porque_padrao,
            dica: correction.erro_ledger.dica,
          },
          stage: 0,
          next_review_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,skill,pattern' },
      )
      .select('*')
      .single();
    reviewItem = created;
  }

  // Patentes vêm dos 4 eixos da rubrica acumulados — nunca de volume de exercícios.
  const { data: progressRow } = await supabase
    .from('skill_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('skill', skill)
    .maybeSingle();

  const delta = correction.rubrica_delta || { precisao: 0, naturalidade: 0, vocabulario: 0, fluencia: 0 };

  await supabase.from('skill_progress').upsert(
    {
      user_id: user.id,
      skill,
      precisao: clampAxis((progressRow?.precisao || 0) + delta.precisao),
      naturalidade: clampAxis((progressRow?.naturalidade || 0) + delta.naturalidade),
      vocabulario: clampAxis((progressRow?.vocabulario || 0) + delta.vocabulario),
      fluencia: clampAxis((progressRow?.fluencia || 0) + delta.fluencia),
      total_attempts: (progressRow?.total_attempts || 0) + 1,
      correct_streak: correct ? (progressRow?.correct_streak || 0) + 1 : 0,
      last_attempt_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,skill' },
  );

  let bossPassed = null;
  if (isBoss && track && typeof stage === 'number') {
    bossPassed = correction.veredito !== 'erro';
    if (bossPassed) {
      await supabase.from('stage_completions').upsert(
        { user_id: user.id, track, stage },
        { onConflict: 'user_id,track,stage' },
      );
    }
  }

  return NextResponse.json({
    correction,
    reviewItem,
    attemptId: attempt?.id || null,
    bossPassed,
    masteryEvent,
  });
}

import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { callClaudeJSON } from '../../../lib/anthropic';
import { computeReviewOutcome, nextReviewDate } from '../../../lib/srs';
import { applyScenarioMastery } from '../../../lib/scenarioProgress';

// Campos opcionais ficam como string vazia ("") em vez de null quando não
// se aplicam — mesma convenção já usada em lib/correct.js, pra manter o
// schema estritamente tipado (sem união com null).
const EVAL_SCHEMA = {
  type: 'object',
  properties: {
    result: { type: 'string', enum: ['correct', 'wrong'] },
    corrected_en: { type: 'string' },
    wrong_excerpt: { type: 'string' },
    right_excerpt: { type: 'string' },
    explain_pt: { type: 'string' },
    error_category: { type: 'string' },
    error_category_label_pt: { type: 'string' },
    natural_phrase_en: { type: 'string' },
    tip_pt: { type: 'string' },
  },
  required: [
    'result', 'corrected_en', 'wrong_excerpt', 'right_excerpt', 'explain_pt',
    'error_category', 'error_category_label_pt', 'natural_phrase_en', 'tip_pt',
  ],
  additionalProperties: false,
};

export const maxDuration = 20;

async function bumpScenarioMastery(supabase, userId, scenarioId) {
  const { data: scenario } = await supabase.from('scenarios').select('target_phrases').eq('id', scenarioId).maybeSingle();
  const targetPhrases = scenario?.target_phrases || 20;

  const { data: state } = await supabase
    .from('user_scenario_state')
    .select('mastered_count')
    .eq('user_id', userId)
    .eq('scenario_id', scenarioId)
    .maybeSingle();

  const { masteredCount, shouldUnlockNext } = applyScenarioMastery({
    masteredCount: state?.mastered_count || 0,
    targetPhrases,
    justMastered: true,
  });

  await supabase.from('user_scenario_state').upsert(
    {
      user_id: userId,
      scenario_id: scenarioId,
      mastered_count: masteredCount,
      status: masteredCount >= targetPhrases ? 'done' : 'current',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,scenario_id' },
  );

  if (shouldUnlockNext) {
    const { data: nextScenario } = await supabase.from('scenarios').select('id').eq('prerequisite_id', scenarioId).maybeSingle();
    if (nextScenario) {
      await supabase.from('user_scenario_state').upsert(
        { user_id: userId, scenario_id: nextScenario.id, mastered_count: 0, status: 'current', updated_at: new Date().toISOString() },
        { onConflict: 'user_id,scenario_id' },
      );
    }
  }

  return { masteredCount, shouldUnlockNext };
}

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

  const { mode, prompt_pt, expected_focus, user_answer, phrase_id, skill_tags } = body;
  if (!user_answer || (mode !== 'writing' && mode !== 'speaking')) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('correction_depth, active_scenario_id')
    .eq('id', user.id)
    .maybeSingle();

  // 'flag_only' (nome atual da coluna) === 'point' (nome usado no pedido) —
  // mesmo conceito, não duplica a preferência.
  const depth = profile?.correction_depth;
  const depthInstruction = depth === 'flag_only' || depth === 'point'
    ? '"explain_pt" deve ter só 1 linha curta, direto ao ponto — nada de parágrafo.'
    : '"explain_pt" pode ter até 2-3 linhas explicando a regra com clareza.';

  const skillLabel = mode === 'speaking' ? 'fala' : 'escrita';
  const system = `Você é um professor de inglês para brasileiros de nível intermediário. Avalia a resposta do aluno a um cenário real de ${skillLabel} — sempre direto, sem jargão gramatical.`;
  const userPrompt = `Cenário (em PT, pedindo resposta em inglês): ${prompt_pt}
Foco esperado: ${expected_focus}
Resposta do aluno: ${user_answer}

Avalie e retorne o JSON do contrato:
- "result": "correct" ou "wrong".
- "corrected_en": a frase corrigida (ou a mesma resposta, se já estava correta).
- "wrong_excerpt"/"right_excerpt": o trecho errado e a correção lado a lado. Vazios ("") se result="correct".
- "explain_pt": o porquê, em português. ${depthInstruction}
- "error_category"/"error_category_label_pt": categoria curta do erro (ex: "preposicoes_tempo" / "Preposições de tempo"). Vazios ("") se result="correct".
- "natural_phrase_en": a versão mais natural possível da frase (mesmo se já estava correta) — vira frase de revisão.
- "tip_pt": chip curtíssimo de dica (até 4 palavras, forma imperativa, ex: "use: by + prazo"). Vazio ("") se result="correct".`;

  let evaluation;
  try {
    evaluation = await callClaudeJSON({ system, user: userPrompt, schema: EVAL_SCHEMA, maxTokens: 400 });
  } catch (err) {
    console.error('evaluate error:', err);
    return NextResponse.json({ error: 'evaluation_failed' }, { status: 500 });
  }

  const correct = evaluation.result === 'correct';

  // a) insere review (~ exercise_attempts)
  const { data: attempt } = await supabase
    .from('exercise_attempts')
    .insert({
      user_id: user.id,
      skill: mode,
      task_type: phrase_id ? 'review' : 'ppp_practice',
      task: { label: expected_focus, context: prompt_pt, askPt: prompt_pt },
      user_input: user_answer,
      feedback: evaluation,
      verdict: correct ? 'correto' : 'erro',
      review_item_id: phrase_id || null,
    })
    .select('id')
    .single();

  // b) se wrong: error_event (log bruto, complementar ao estado agregado
  // que review_items já mantém)
  if (!correct && evaluation.error_category) {
    await supabase.from('error_events').insert({
      user_id: user.id,
      category: evaluation.error_category,
      category_label_pt: evaluation.error_category_label_pt || evaluation.error_category,
      detail_pt: evaluation.explain_pt,
      wrong_text: evaluation.wrong_excerpt || user_answer,
      right_text: evaluation.right_excerpt || evaluation.corrected_en,
    });
  }

  let reviewItem = null;
  let scenarioUpdate = null;

  if (phrase_id) {
    // c) era revisão: aplica a progressão 0/1/7/30 já existente em lib/srs.js
    const { data: existing } = await supabase
      .from('review_items')
      .select('*')
      .eq('id', phrase_id)
      .eq('user_id', user.id)
      .maybeSingle();

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
        .eq('id', phrase_id)
        .select('*')
        .single();

      await supabase.from('review_events').insert({
        review_item_id: phrase_id,
        user_id: user.id,
        result: correct ? 'correct' : 'incorrect',
        stage_before: existing.stage,
        stage_after: outcome.stage,
      });

      reviewItem = updated;

      if (!existing.mastered && outcome.mastered && existing.scenario_id) {
        scenarioUpdate = await bumpScenarioMastery(supabase, user.id, existing.scenario_id);
      }
    }
  } else {
    // d) não era revisão: cria phrase nova vinculada ao cenário ativo,
    // srs_due = amanhã (stage 0 do agendamento já existente 0/1/7/30).
    const pattern = (evaluation.error_category || evaluation.natural_phrase_en || '').slice(0, 80);
    const { data: created } = await supabase
      .from('review_items')
      .upsert(
        {
          user_id: user.id,
          type: correct ? 'vocab' : 'error',
          skill: mode,
          pattern,
          scenario_id: profile?.active_scenario_id || null,
          content: {
            categoria: evaluation.error_category_label_pt || expected_focus,
            exemplos_do_usuario: [user_answer],
            forma_natural: evaluation.natural_phrase_en,
            porque: evaluation.explain_pt,
            dica: evaluation.tip_pt,
            skill_tags: skill_tags || [],
          },
          stage: 0,
          next_review_at: new Date(Date.now() + 86400000).toISOString(),
        },
        { onConflict: 'user_id,skill,pattern' },
      )
      .select('*')
      .single();
    reviewItem = created;
  }

  return NextResponse.json({ evaluation, reviewItem, attemptId: attempt?.id || null, scenarioUpdate });
}

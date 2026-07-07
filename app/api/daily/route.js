import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { callClaudeJSON } from '../../../lib/anthropic';
import { todayKeySP } from '../../../lib/dates';

// Contrato do conteúdo diário — sempre cenários reais em PT pedindo resposta
// em inglês, nunca gramática abstrata solta.
const DAILY_SCHEMA = {
  type: 'object',
  properties: {
    phrase_of_day: {
      type: 'object',
      properties: {
        en: { type: 'string' },
        explain_pt: { type: 'string' },
        context_label: { type: 'string' },
      },
      required: ['en', 'explain_pt', 'context_label'],
      additionalProperties: false,
    },
    writing: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          prompt_pt: { type: 'string' },
          expected_focus: { type: 'string' },
          skill_tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['prompt_pt', 'expected_focus', 'skill_tags'],
        additionalProperties: false,
      },
    },
    speaking: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          prompt_pt: { type: 'string' },
          expected_focus: { type: 'string' },
          skill_tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['prompt_pt', 'expected_focus', 'skill_tags'],
        additionalProperties: false,
      },
    },
  },
  required: ['phrase_of_day', 'writing', 'speaking'],
  additionalProperties: false,
};

// Fallback hardcoded final — só usado se o Claude falhar E não existir
// nenhum daily_content anterior pra repetir.
function hardcodedFallback() {
  return {
    phrase_of_day: { en: "I'll have it ready by Friday.", explain_pt: '"by" marca um prazo final — no mais tardar até aquele dia.', context_label: 'prazos' },
    writing: [
      { prompt_pt: 'Seu gerente pergunta no Slack se o relatório fica pronto hoje. Responda de forma direta, mas educada.', expected_focus: 'future simple + by', skill_tags: ['preposicoes_tempo'] },
      { prompt_pt: 'Um colega pediu ajuda numa tarefa técnica. Responda dizendo que pode ajudar depois do almoço.', expected_focus: 'pedidos educados', skill_tags: ['pedidos_educados'] },
      { prompt_pt: 'Seu chefe perguntou como está o andamento de um projeto. Escreva um resumo curto.', expected_focus: 'present continuous', skill_tags: ['vocab_reuniao'] },
    ],
    speaking: [
      { prompt_pt: 'É sua vez de falar na daily meeting. Diga o que fez ontem e o que vai fazer hoje.', expected_focus: 'past + future juntos', skill_tags: ['vocab_reuniao'] },
      { prompt_pt: 'Alguém pergunta se você pode remarcar uma reunião. Proponha um novo horário educadamente.', expected_focus: 'would/could', skill_tags: ['pedidos_educados'] },
    ],
  };
}

export const maxDuration = 30;

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const today = todayKeySP();

  // Idempotente por dia — nunca gera 2x no mesmo dia.
  const { data: existing } = await supabase
    .from('daily_content')
    .select('*')
    .eq('user_id', user.id)
    .eq('day', today)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      phrase_of_day: existing.phrase_of_day,
      exercises: existing.exercises,
      generated_at: existing.generated_at,
      cached: true,
    });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_scenario_id')
    .eq('id', user.id)
    .maybeSingle();

  let activeScenario = null;
  if (profile?.active_scenario_id) {
    const { data } = await supabase
      .from('scenarios')
      .select('title, subtitle, skill_tags')
      .eq('id', profile.active_scenario_id)
      .maybeSingle();
    activeScenario = data;
  }

  const { data: themeRows } = await supabase
    .from('user_theme_selection')
    .select('track_id')
    .eq('user_id', user.id);
  const extraTopics = (themeRows || []).map((r) => r.track_id);

  const sinceDate = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: recentErrors } = await supabase
    .from('error_events')
    .select('category, category_label_pt')
    .eq('user_id', user.id)
    .gte('occurred_at', sinceDate);

  const categoryCounts = {};
  (recentErrors || []).forEach((e) => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => {
      const label = recentErrors.find((e) => e.category === category)?.category_label_pt || category;
      return `${label} (${count}x)`;
    });

  const nowIso = new Date().toISOString();
  const { data: dueItems } = await supabase
    .from('review_items')
    .select('pattern')
    .eq('user_id', user.id)
    .eq('mastered', false)
    .not('pattern', 'is', null)
    .lte('next_review_at', nowIso)
    .limit(5);

  const contextLines = [
    activeScenario
      ? `Cenário ativo: "${activeScenario.title}" — ${activeScenario.subtitle || ''} (tags: ${(activeScenario.skill_tags || []).join(', ') || 'nenhuma'}).`
      : 'Sem cenário ativo definido — use um cenário genérico de trabalho remoto.',
    extraTopics.length ? `Temas extras selecionados pelo aluno: ${extraTopics.join(', ')}.` : 'Sem temas extras selecionados.',
    topCategories.length ? `Categorias de erro mais frequentes nos últimos 7 dias: ${topCategories.join(', ')}.` : 'Nenhum erro recente registrado.',
    dueItems?.length ? `Padrões com revisão vencida hoje: ${dueItems.map((i) => i.pattern).join('; ')}.` : 'Nenhuma revisão vencida hoje.',
  ].join('\n');

  const system = 'Você monta o conteúdo diário de um app de inglês para brasileiros de nível intermediário (B1 prático). Todo exercício é um CENÁRIO REAL em português pedindo resposta em inglês (nunca gramática abstrata solta, nunca frase suelta pra traduzir) — no formato "seu chefe pergunta X, responda dizendo Y". Se houver categoria de erro frequente, pelo menos 1 exercício de escrita e 1 de fala devem mirar exatamente essa categoria.';

  const userPrompt = `Contexto do aluno:\n${contextLines}\n\nGere: 1 frase do dia (com explicação em PT e o contexto em que ela se aplica), exatamente 3 exercícios de escrita e exatamente 2 de fala — todos cenários reais dentro do cenário ativo (varie usando os temas extras quando fizer sentido).`;

  let generated;
  let usedFallback = false;
  try {
    generated = await callClaudeJSON({ system, user: userPrompt, schema: DAILY_SCHEMA, maxTokens: 900 });
  } catch (err) {
    console.error('daily content generation failed, falling back:', err);
    usedFallback = true;
    const { data: previous } = await supabase
      .from('daily_content')
      .select('phrase_of_day, exercises')
      .eq('user_id', user.id)
      .order('day', { ascending: false })
      .limit(1)
      .maybeSingle();
    generated = previous
      ? { phrase_of_day: previous.phrase_of_day, writing: previous.exercises?.writing || [], speaking: previous.exercises?.speaking || [] }
      : hardcodedFallback();
  }

  const phraseOfDay = generated.phrase_of_day;
  const exercises = { writing: generated.writing, speaking: generated.speaking };

  const { data: saved, error: saveError } = await supabase
    .from('daily_content')
    .upsert(
      { user_id: user.id, day: today, phrase_of_day: phraseOfDay, exercises, generated_at: new Date().toISOString() },
      { onConflict: 'user_id,day' },
    )
    .select('*')
    .single();

  if (saveError) {
    return NextResponse.json({ error: 'save_failed', details: saveError.message }, { status: 500 });
  }

  return NextResponse.json({
    phrase_of_day: saved.phrase_of_day,
    exercises: saved.exercises,
    generated_at: saved.generated_at,
    cached: false,
    usedFallback,
  });
}

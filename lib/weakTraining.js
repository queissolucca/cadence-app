import { callClaudeJSON } from './anthropic';

// Etapa 9 — treino direcionado. Reusa error_events (já existe desde a
// Etapa 0/foundation_v2) como fonte de verdade das categorias mais
// erradas; não cria tabela nova. Extraído em lib/ pro mesmo padrão de
// lib/dailyContent.js: o server component da página chama isto direto
// (sem round-trip de rede) e a rota POST /api/weak-training é um wrapper
// fino pro mesmo uso via fetch/teste.

const EXERCISES_SCHEMA = {
  type: 'object',
  properties: {
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['writing', 'speaking'] },
          category: { type: 'string' },
          prompt_pt: { type: 'string' },
          expected_focus: { type: 'string' },
          skill_tags: { type: 'array', items: { type: 'string' } },
          personal_hint_pt: { type: 'string' },
        },
        required: ['mode', 'category', 'prompt_pt', 'expected_focus', 'skill_tags', 'personal_hint_pt'],
        additionalProperties: false,
      },
    },
  },
  required: ['exercises'],
  additionalProperties: false,
};

const WINDOW_DAYS = 14;

export async function buildWeakTrainingQueue(supabase, user) {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
  const { data: errors } = await supabase
    .from('error_events')
    .select('category, category_label_pt, wrong_text, right_text, occurred_at')
    .eq('user_id', user.id)
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false });

  if (!errors || errors.length === 0) {
    return { empty: true, categories: [], exercises: [] };
  }

  const byCategory = {};
  errors.forEach((e) => {
    if (!byCategory[e.category]) byCategory[e.category] = { category: e.category, label: e.category_label_pt || e.category, count: 0, examples: [] };
    byCategory[e.category].count += 1;
    if (byCategory[e.category].examples.length < 2) {
      byCategory[e.category].examples.push({ wrong: e.wrong_text, right: e.right_text });
    }
  });

  const topCategories = Object.values(byCategory).sort((a, b) => b.count - a.count).slice(0, 3);
  const catA = topCategories[0];
  const catB = topCategories[1] || topCategories[0];
  const catC = topCategories[2] || topCategories[0];

  console.log('[weak-training] categorias top:', topCategories.map((c) => `${c.category} (${c.count}x)`).join(', '));

  const describeCategory = (c) => `"${c.label}" (categoria: ${c.category}, ${c.count}x nos últimos ${WINDOW_DAYS} dias). Exemplos reais do aluno: ${c.examples.map((ex) => `errou "${ex.wrong}" em vez de "${ex.right}"`).join('; ') || 'sem exemplo detalhado'}.`;

  const system = 'Você é um professor de inglês para brasileiros de nível intermediário. Monta uma sessão de treino DIRECIONADO, mirando exatamente os erros reais e recentes do aluno — nunca gramática genérica solta. Cada exercício é um cenário real em português pedindo resposta em inglês.';
  const userPrompt = `Categorias de erro mais frequentes do aluno:
1. ${describeCategory(catA)}
2. ${describeCategory(catB)}
3. ${describeCategory(catC)}

Gere exatamente 5 exercícios: 2 de writing mirando a categoria 1, 2 de speaking mirando a categoria 2, e 1 (writing ou speaking, o que fizer mais sentido) mirando a categoria 3. Se só houver 1 ou 2 categorias distintas, reforce a categoria 1 nos exercícios que sobrarem.

Para cada exercício:
- "category": o texto exato da categoria (campo "categoria" acima) que ele mira.
- "prompt_pt": cenário real em português pedindo resposta em inglês.
- "expected_focus": a estrutura/foco esperado na resposta.
- "skill_tags": 1-2 tags curtas.
- "personal_hint_pt": frase curta CITANDO o erro real do aluno (ex: "você escreveu 'until Friday' na sua última tentativa — lembre: prazo final = 'by'"). Nunca genérica — sempre referenciando o exemplo real dado acima.`;

  let generated;
  try {
    generated = await callClaudeJSON({ system, user: userPrompt, schema: EXERCISES_SCHEMA, maxTokens: 900 });
  } catch (err) {
    console.error('weak-training generation failed:', err);
    return { empty: false, categories: topCategories, exercises: [], generationFailed: true };
  }

  console.log('[weak-training] exercícios gerados:', generated.exercises.map((e) => `${e.mode}/${e.category}`).join(', '));

  return { empty: false, categories: topCategories, exercises: generated.exercises };
}

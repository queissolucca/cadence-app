import { callClaudeJSON } from './anthropic';

// Etapa 10 — "antes e depois" do /v2. Compara sempre contra o Dia 1 fixo
// (profiles.baseline_question/baseline_answer, Etapa 1), não contra o
// snapshot anterior (isso é o que o app antigo faz com progress_snapshots —
// ver comentário na migration 0009 sobre por que não reusamos aquela
// tabela).
const FIRST_UNLOCK_DAYS = 14; // 2 semanas — regra da Etapa 11 (dia 1 do uso)
const RECHECK_DAYS = 28; // 4 semanas — regra da Etapa 10

export async function getBeforeAfterAvailability(supabase, user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('baseline_question, baseline_answer, baseline_date')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.baseline_question || !profile?.baseline_answer) {
    return { hasBaseline: false, available: false, nextDate: null, lastCheck: null, profile };
  }

  const { data: lastCheck } = await supabase
    .from('before_after_checks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const anchor = lastCheck ? new Date(lastCheck.created_at) : new Date(profile.baseline_date || Date.now());
  const unlockDays = lastCheck ? RECHECK_DAYS : FIRST_UNLOCK_DAYS;
  const nextDate = new Date(anchor.getTime() + unlockDays * 86400000);
  const available = Date.now() >= nextDate.getTime();

  return { hasBaseline: true, available, nextDate, lastCheck, profile };
}

const ANNOTATED_SEGMENTS = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      text: { type: 'string' },
      flag: { type: 'boolean' },
    },
    required: ['text', 'flag'],
    additionalProperties: false,
  },
};

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    then_segments: ANNOTATED_SEGMENTS,
    now_segments: ANNOTATED_SEGMENTS,
    wins: {
      type: 'array',
      items: { type: 'object', properties: { pt: { type: 'string' } }, required: ['pt'], additionalProperties: false },
    },
    message_pt: { type: 'string' },
  },
  required: ['then_segments', 'now_segments', 'wins', 'message_pt'],
  additionalProperties: false,
};

// Concatenar text de todos os segments tem que reconstruir o texto
// original byte a byte — senão a IA inventou/alterou trecho, e não
// confiamos na anotação (critério de aceite da Etapa 10).
function reconstructs(segments, original) {
  return (segments || []).map((s) => s.text).join('') === original;
}

async function generateAnalysis({ question, thenAnswer, nowAnswer, historyLines, strict }) {
  const system = 'Você é um professor de inglês avaliando a evolução de um aluno brasileiro comparando duas respostas à MESMA pergunta, com semanas de intervalo.';
  const strictNote = strict
    ? '\n\nATENÇÃO: na tentativa anterior, a concatenação dos segmentos não reconstruiu o texto original exatamente. Desta vez, "then_segments" e "now_segments" precisam, quando concatenados (campo "text" de cada item, na ordem, sem separador), reproduzir EXATAMENTE a resposta original — incluindo espaços, pontuação e capitalização. Não corrija, não resuma, não pule nada: apenas divida o texto original em pedaços e marque cada um.'
    : '';

  const userPrompt = `Pergunta original: "${question}"

Resposta do Dia 1: "${thenAnswer}"
Resposta de hoje: "${nowAnswer}"

Histórico de progresso do aluno desde o Dia 1:
${historyLines || '(sem histórico adicional)'}

Tarefa:
- "then_segments": divida a resposta do Dia 1 em pedaços curtos (frases ou trechos), marcando "flag": true nos trechos com erro real, false no resto. A concatenação exata de todos os "text" (na ordem, sem adicionar nada) tem que reproduzir a resposta do Dia 1 caractere por caractere.
- "now_segments": divida a resposta de hoje do mesmo jeito, marcando "flag": true nos trechos que mostram algo que o aluno aprendeu/corrigiu desde o Dia 1 (comparado aos erros do Dia 1 ou ao histórico), false no resto. Mesma regra de reconstrução exata pra resposta de hoje.
- "wins": até 3 pontos concretos de evolução real (ex: "'by Friday' no lugar de 'until Friday' — prazo final correto"). Só inclua o que for genuinamente visível comparando as duas respostas ou o histórico — não invente.
- "message_pt": 1 frase curta, positiva e específica sobre a evolução (não genérica).${strictNote}`;

  return callClaudeJSON({ system, user: userPrompt, schema: ANALYSIS_SCHEMA, maxTokens: 800, temperature: 0.3 });
}

export async function runBeforeAfterCheck(supabase, user, answer) {
  const { hasBaseline, profile } = await getBeforeAfterAvailability(supabase, user);
  if (!hasBaseline) {
    return { error: 'no_baseline' };
  }

  const question = profile.baseline_question;
  const thenAnswer = profile.baseline_answer;
  const nowAnswer = answer.trim();

  const [{ data: masteredItems }, { data: recentErrors }] = await Promise.all([
    supabase.from('review_items').select('content').eq('user_id', user.id).eq('mastered', true).order('mastered_at', { ascending: false }).limit(10),
    supabase.from('error_events').select('category_label_pt').eq('user_id', user.id).order('occurred_at', { ascending: false }).limit(20),
  ]);

  const masteredLines = (masteredItems || [])
    .map((i) => i.content?.dica || i.content?.forma_natural)
    .filter(Boolean)
    .slice(0, 8)
    .map((l) => `- dominou: ${l}`);
  const errorCategories = [...new Set((recentErrors || []).map((e) => e.category_label_pt))].slice(0, 5);
  const historyLines = [...masteredLines, errorCategories.length ? `- categorias trabalhadas: ${errorCategories.join(', ')}` : null].filter(Boolean).join('\n');

  let analysis;
  let annotated = true;
  try {
    analysis = await generateAnalysis({ question, thenAnswer, nowAnswer, historyLines });
    if (!reconstructs(analysis.then_segments, thenAnswer) || !reconstructs(analysis.now_segments, nowAnswer)) {
      analysis = await generateAnalysis({ question, thenAnswer, nowAnswer, historyLines, strict: true });
    }
    if (!reconstructs(analysis.then_segments, thenAnswer) || !reconstructs(analysis.now_segments, nowAnswer)) {
      annotated = false;
      analysis = {
        ...analysis,
        then_segments: [{ text: thenAnswer, flag: false }],
        now_segments: [{ text: nowAnswer, flag: false }],
      };
    }
  } catch (err) {
    console.error('before-after analysis failed:', err);
    return { error: 'analysis_failed' };
  }

  const { data: saved, error: saveError } = await supabase
    .from('before_after_checks')
    .insert({
      user_id: user.id,
      question,
      then_answer: thenAnswer,
      now_answer: nowAnswer,
      analysis,
    })
    .select('*')
    .single();

  if (saveError || !saved) {
    return { error: 'save_failed' };
  }

  return { check: saved, annotated };
}

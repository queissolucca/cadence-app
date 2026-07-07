import { callClaudeJSON } from './anthropic';

// Fluxo de roleplay novo (missão + personagem), persistido em
// roleplay_sessions (migration 0005). Arquivo separado de lib/roleplay.js
// de propósito — aquele já atende o roleplay antigo do CadenceApp.js (em
// produção, contrato diferente); não foi tocado pra não arriscar quebrá-lo.

const START_SCHEMA = {
  type: 'object',
  properties: {
    mission_pt: { type: 'string' },
    character_name: { type: 'string' },
    character_role_pt: { type: 'string' },
    opening_en: { type: 'string' },
  },
  required: ['mission_pt', 'character_name', 'character_role_pt', 'opening_en'],
  additionalProperties: false,
};

function fallbackStart(scenarioTitle) {
  return {
    mission_pt: `Explique uma situação do dia a dia em ${scenarioTitle} e chegue a um acordo.`,
    character_name: 'Alex',
    character_role_pt: 'colega de trabalho',
    opening_en: "Hey, do you have a minute to talk?",
  };
}

export async function startRoleplay({ scenarioTitle, scenarioSubtitle }) {
  const system = 'Você monta o início de um roleplay em inglês pra um aluno brasileiro de nível intermediário praticar um cenário real de trabalho.';
  const userPrompt = `Cenário: "${scenarioTitle}" — ${scenarioSubtitle || ''}.

Invente: uma missão curta e VERIFICÁVEL (algo que dá pra saber se foi cumprido, ex: "avise que a tarefa atrasou e proponha um novo prazo"), um personagem coerente com o cenário (nome + papel em português, ex: "seu gerente"), e a primeira fala dele em inglês, 1-2 frases, abrindo a conversa.`;

  try {
    return await callClaudeJSON({ system, user: userPrompt, schema: START_SCHEMA, maxTokens: 250, temperature: 0.5 });
  } catch (err) {
    console.error('roleplay start error:', err);
    return fallbackStart(scenarioTitle);
  }
}

const TURN_SCHEMA = {
  type: 'object',
  properties: {
    ai_reply_en: { type: 'string' },
    mission_complete: { type: 'boolean' },
    has_correction: { type: 'boolean' },
    wrong_excerpt: { type: 'string' },
    right_excerpt: { type: 'string' },
    explain_pt: { type: 'string' },
    error_category: { type: 'string' },
    error_category_label_pt: { type: 'string' },
    natural_phrase_en: { type: 'string' },
    tip_pt: { type: 'string' },
    has_praise: { type: 'boolean' },
    praise_pt: { type: 'string' },
  },
  required: [
    'ai_reply_en', 'mission_complete', 'has_correction', 'wrong_excerpt', 'right_excerpt', 'explain_pt',
    'error_category', 'error_category_label_pt', 'natural_phrase_en', 'tip_pt', 'has_praise', 'praise_pt',
  ],
  additionalProperties: false,
};

function fallbackTurn() {
  return {
    ai_reply_en: "Sorry, I'm having a bit of trouble right now — let's continue in a moment.",
    mission_complete: false,
    has_correction: false, wrong_excerpt: '', right_excerpt: '', explain_pt: '', error_category: '', error_category_label_pt: '', natural_phrase_en: '', tip_pt: '',
    has_praise: false, praise_pt: '',
  };
}

// depth/strictness seguem o mesmo padrão de app/api/evaluate/route.js —
// roleplay é conversa (texto ou voz, via o mesmo hook de fala da Etapa 4),
// então aplica a mesma tolerância de transcrição que a fala normal.
function depthInstructionFor(depth) {
  return depth === 'flag_only' || depth === 'point'
    ? '"explain_pt" deve ter só 1 linha curta, direto ao ponto — nada de parágrafo.'
    : '"explain_pt" pode ter até 2-3 linhas explicando a regra com clareza.';
}

function strictnessInstructionFor(strictness) {
  return {
    low: 'A fala do aluno pode ter vindo de transcrição de voz automática, que erra grafia/pequenos detalhes sem relação com a fala real. Seja BEM tolerante — só marque erro se for claramente gramatical/de escolha de palavra, nunca por causa de erro óbvio de transcrição.',
    medium: 'A fala do aluno pode ter vindo de transcrição de voz automática. Considere que pequenos deslizes podem ser da transcrição, não da fala — mas ainda marque erros gramaticais/de naturalidade reais.',
    high: 'Avalie a fala do aluno com o mesmo rigor de um texto escrito, mesmo podendo ser transcrição de voz.',
  }[strictness || 'medium'];
}

export async function continueRoleplay({ missionPt, characterName, characterRolePt, messages, turnsDone, turnsTarget, correctionDepth, pronunciationStrictness }) {
  const history = (messages || [])
    .filter((m) => m.role === 'ai' || m.role === 'user')
    .map((m) => `${m.role === 'ai' ? characterName : 'Aluno'}: ${m.text}`)
    .join('\n');

  const system = `Você interpreta ${characterName} (${characterRolePt}) num roleplay em inglês com um aluno brasileiro de nível intermediário. Missão do aluno: ${missionPt}. Conduza a conversa naturalmente, sem sair do personagem, e analise a fala do aluno em busca de erros — mas NUNCA interrompa o fluxo da conversa pra corrigir; a correção é um dado à parte que a UI mostra separadamente. ${strictnessInstructionFor(pronunciationStrictness)}`;

  const userPrompt = `Histórico da conversa até agora:
${history || '(início da conversa)'}

O aluno já falou ${turnsDone} vez(es), meta de ${turnsTarget} turnos. Responda em personagem, em inglês, 1-2 frases avançando a conversa. Marque "mission_complete": true só quando a missão realmente tiver sido cumprida (ou não antes do turno ${turnsTarget}).

Analise a ÚLTIMA fala do aluno (a mais recente da lista):
- "has_correction": true se houve erro real (gramática/naturalidade). Se true, preencha wrong_excerpt/right_excerpt/explain_pt/error_category/error_category_label_pt/natural_phrase_en/tip_pt. Se false, todos esses campos vazios (""). ${depthInstructionFor(correctionDepth)}
- "has_praise": true se o aluno usou corretamente algo que era um erro comum/esperado nessa altura (mereça um elogio específico, citando o quê). Se true, preencha "praise_pt" citando o que ele acertou. Nunca true junto com has_correction=true no mesmo turno — escolha um ou outro conforme o que for mais relevante.`;

  try {
    return await callClaudeJSON({ system, user: userPrompt, schema: TURN_SCHEMA, maxTokens: 500, temperature: 0.4 });
  } catch (err) {
    console.error('roleplay turn error:', err);
    return fallbackTurn();
  }
}

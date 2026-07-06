import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// §6 — tarefa comunicativa completa (TBLT): a IA assume um papel dentro do
// tema selecionado e conduz 3-5 turnos. Correção só acontece no final da
// troca inteira (evaluateRoleplay) — nunca interrompe o fluxo da simulação.
const TURN_SCHEMA = {
  type: 'object',
  properties: {
    premise: { type: 'string' },
    reply: { type: 'string' },
    done: { type: 'boolean' },
  },
  required: ['premise', 'reply', 'done'],
  additionalProperties: false,
};

function fallbackTurn(premise) {
  return { premise: premise || 'Vamos praticar uma conversa curta.', reply: "Sorry, I'm having trouble right now — let's pick this up again in a bit.", done: true };
}

export async function getRoleplayTurn({ themeLabel, premise, transcript }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackTurn(premise);
  }

  const history = (transcript || []).map((t) => `${t.role === 'ai' ? 'Você (personagem)' : 'Aluno'}: ${t.text}`).join('\n');
  const userTurns = (transcript || []).filter((t) => t.role === 'user').length;
  const isFirstTurn = !premise;

  const prompt = `Você conduz um roleplay em inglês com um aluno brasileiro de nível intermediário pra cima, dentro do tema "${themeLabel}".

${isFirstTurn
    ? 'Invente uma premissa curta e concreta pra essa simulação (em português, 1 frase) e comece a conversa em inglês, em personagem, com 1 frase natural que dê o primeiro gancho pro aluno responder.'
    : `Premissa já estabelecida: ${premise}\n\nHistórico da conversa até agora:\n${history}\n\nContinue em personagem, em inglês, 1-2 frases curtas e naturais, avançando a situação.`}

O aluno já respondeu ${userTurns} vez(es) nessa conversa. Depois de pelo menos 3 e no máximo 5 falas do aluno, encerre a simulação de forma natural (ex: se despedindo, fechando o assunto) e marque "done": true. Antes disso, "done": false.

Retorne "premise" (a premissa em português — repita a mesma se já estabelecida), "reply" (sua fala em inglês, em personagem) e "done" (boolean).`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 220,
      temperature: 0.4,
      output_config: {
        format: { type: 'json_schema', schema: TURN_SCHEMA },
      },
      messages: [{ role: 'user', content: prompt }],
    });

    if (response.stop_reason === 'refusal') {
      throw new Error('Claude refused the request.');
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) {
      throw new Error('Claude did not return a text response.');
    }

    return JSON.parse(textBlock.text);
  } catch (error) {
    console.error('Roleplay turn error:', error);
    return fallbackTurn(premise);
  }
}

const EVAL_SCHEMA = {
  type: 'object',
  properties: {
    resumo: { type: 'string' },
    erros: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          categoria: { type: 'string' },
          exemplo_usuario: { type: 'string' },
          forma_natural: { type: 'string' },
          porque: { type: 'string' },
          dica: { type: 'string' },
        },
        required: ['pattern', 'categoria', 'exemplo_usuario', 'forma_natural', 'porque', 'dica'],
        additionalProperties: false,
      },
    },
  },
  required: ['resumo', 'erros'],
  additionalProperties: false,
};

function fallbackEval() {
  return { resumo: 'Não consegui avaliar agora.', erros: [] };
}

// Avalia a troca INTEIRA de uma vez, nunca turno a turno — interromper
// quebraria a tarefa comunicativa que é o ponto do TBLT.
export async function evaluateRoleplay({ themeLabel, transcript }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackEval();
  }

  const history = (transcript || []).map((t) => `${t.role === 'ai' ? 'Personagem' : 'Aluno'}: ${t.text}`).join('\n');

  const prompt = `Um aluno de inglês brasileiro (intermediário pra cima) acabou de fazer um roleplay em inglês sobre "${themeLabel}". Avalie a troca inteira de uma vez — não é uma correção frase a frase.

Conversa:
${history}

Retorne:
- "resumo": até 200 caracteres, direto, sem hype, sobre como foi a troca no geral.
- "erros": no máximo 3 padrões de erro relevantes nas falas do aluno (ignore erros pontuais isolados; foque em padrões recorrentes ou que atrapalharam a comunicação, incluindo hesitação/ordem de palavras sob pressão conversacional). Pra cada: pattern (descrição curta), categoria, exemplo_usuario (trecho real do aluno), forma_natural (como um nativo diria), porque (uma linha), dica (chip curtíssimo, máximo 4 palavras).`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      temperature: 0,
      output_config: {
        format: { type: 'json_schema', schema: EVAL_SCHEMA },
      },
      messages: [{ role: 'user', content: prompt }],
    });

    if (response.stop_reason === 'refusal') {
      throw new Error('Claude refused the request.');
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) {
      throw new Error('Claude did not return a text response.');
    }

    return JSON.parse(textBlock.text);
  } catch (error) {
    console.error('Roleplay eval error:', error);
    return fallbackEval();
  }
}

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const TASK_SCHEMA = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    context: { type: 'string' },
    askPt: { type: 'string' },
    presentation: { type: 'string' },
  },
  required: ['label', 'context', 'askPt', 'presentation'],
  additionalProperties: false,
};

const FALLBACK_TASKS = {
  writing: {
    label: 'PRÁTICA LIVRE',
    context: 'Escreva uma mensagem curta contando como foi o seu dia.',
    askPt: 'Escreva 2 a 3 frases em inglês sobre o seu dia.',
    presentation: 'Use o passado simples ("I went", "I had", "I worked") para contar o que já aconteceu.',
  },
  speaking: {
    label: 'PRÁTICA LIVRE',
    context: 'Você encontra um amigo na rua depois de um tempo sem se ver.',
    askPt: 'Cumprimente e pergunte como ele está.',
    presentation: '"How have you been?" é a forma natural de perguntar como alguém está depois de um tempo.',
  },
};

// Gera uma tarefa comunicativa real (TBLT) calibrada um pouco acima do nível
// atual do usuário (i+1 de Krashen), com uma etapa de apresentação (PPP).
export async function generateTask({ skill, cefrLevel, canDo }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return FALLBACK_TASKS[skill] || FALLBACK_TASKS.writing;
  }

  const skillLabel = skill === 'speaking' ? 'fala' : 'escrita';
  const prompt = `Você é um designer de tarefas de ensino de inglês, seguindo Task-Based Language Learning (TBLT) e a hipótese do i+1 de Krashen.

Crie UMA tarefa comunicativa real e curta de ${skillLabel} para um aluno de nível ${cefrLevel} do CEFR.

Competência-alvo (can-do statement): ${canDo}

Regras:
- A tarefa deve ser uma situação real de comunicação (email, conversa, pedido etc.), nunca uma frase isolada para traduzir.
- Calibre a dificuldade no nível ${cefrLevel}, mas inclua um elemento levemente mais desafiador que o esperado nesse nível (i+1) — não pule um nível inteiro.
- "label": categoria curta em maiúsculas (ex: "EMAIL DE TRABALHO", "RESTAURANTE").
- "context": a situação, em português, 1-2 frases.
- "askPt": o que o aluno deve fazer, em português, 1 frase objetiva.
- "presentation": um mini ensinamento em português (1-2 frases) apresentando a estrutura ou vocabulário-alvo em inglês ANTES do aluno tentar, com um exemplo entre aspas. É a etapa de "Presentation" do método PPP — não repita esse exemplo dentro do "context".

Retorne só os 4 campos.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      output_config: {
        format: { type: 'json_schema', schema: TASK_SCHEMA },
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
    console.error('Task generation error:', error);
    return FALLBACK_TASKS[skill] || FALLBACK_TASKS.writing;
  }
}

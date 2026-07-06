import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Onboarding reduzido a 2 perguntas (§Parte 1) — só um norte inicial, não uma
// avaliação precisa. O nível real se ajusta com uso, via SRS/desempenho.
export const WRITING_TASK = {
  id: 'writing',
  label: 'ANTES DE COMEÇAR',
  context: 'Conte rapidinho: o que você fez ontem?',
  askPt: 'Escreva 1-2 frases curtas em inglês.',
};

export const SPEAKING_OPTIONS = [
  { id: 'a', label: 'trava e não sai nada' },
  { id: 'b', label: 'sai mas devagar e travado' },
  { id: 'c', label: 'sai mas com insegurança' },
  { id: 'd', label: 'sai relativamente bem, só quero polir' },
];

const CEFR_ENUM = ['A2', 'B1', 'B2', 'C1'];

const DIAGNOSTIC_SCHEMA = {
  type: 'object',
  properties: {
    writing: {
      type: 'object',
      properties: {
        precisao: { type: 'integer' },
        naturalidade: { type: 'integer' },
        vocabulario: { type: 'integer' },
        fluencia: { type: 'integer' },
        cefr: { type: 'string', enum: CEFR_ENUM },
        resumo: { type: 'string' },
      },
      required: ['precisao', 'naturalidade', 'vocabulario', 'fluencia', 'cefr', 'resumo'],
      additionalProperties: false,
    },
    speaking: {
      type: 'object',
      properties: {
        precisao: { type: 'integer' },
        naturalidade: { type: 'integer' },
        vocabulario: { type: 'integer' },
        fluencia: { type: 'integer' },
        cefr: { type: 'string', enum: CEFR_ENUM },
        resumo: { type: 'string' },
      },
      required: ['precisao', 'naturalidade', 'vocabulario', 'fluencia', 'cefr', 'resumo'],
      additionalProperties: false,
    },
    diagnostico: { type: 'string' },
    itens_ledger: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          categoria: { type: 'string' },
          skill: { type: 'string', enum: ['writing'] },
          exemplo_usuario: { type: 'string' },
          forma_natural: { type: 'string' },
          porque: { type: 'string' },
          dica: { type: 'string' },
        },
        required: ['pattern', 'categoria', 'skill', 'exemplo_usuario', 'forma_natural', 'porque', 'dica'],
        additionalProperties: false,
      },
    },
  },
  required: ['writing', 'speaking', 'diagnostico', 'itens_ledger'],
  additionalProperties: false,
};

function fallbackDiagnostic() {
  const axes = { precisao: 50, naturalidade: 50, vocabulario: 50, fluencia: 50, cefr: 'B1', resumo: 'Não foi possível avaliar agora — nível inicial padrão aplicado.' };
  return {
    writing: axes,
    speaking: { ...axes },
    diagnostico: 'Não conseguimos analisar agora — começamos com um nível padrão e ajustamos com o seu uso.',
    itens_ledger: [],
  };
}

// Uma ÚNICA chamada batch avalia as 2 respostas juntas — nunca 2 calls.
export async function runDiagnostic({ writingText, speakingChoice }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackDiagnostic();
  }

  const speakingOption = SPEAKING_OPTIONS.find((opt) => opt.id === speakingChoice) || SPEAKING_OPTIONS[1];

  const prompt = `Você é um avaliador de proficiência em inglês para brasileiros de nível intermediário pra cima (o produto não atende iniciantes — o nível mínimo esperado é A2). Isso é só um NORTE inicial rápido, não uma avaliação precisa; o nível real vai se ajustar com o uso real do produto ao longo do tempo.

Você recebe duas respostas:

1) WRITING — resposta livre em inglês à tarefa: "${WRITING_TASK.context} (${WRITING_TASK.askPt})"
Resposta do aluno: ${writingText || '(em branco)'}

2) SPEAKING — auto-relato (não é texto real, é uma escolha numa escala): quando o aluno precisa falar inglês em tempo real (call, conversa), o que mais acontece: "${speakingOption.label}".
Use essa escolha para estimar um nível de fala INICIAL e aproximado (não meça a escrita como proxy de fala) — trate como sinal fraco, não como medição.

Para cada habilidade, retorne os 4 eixos (0-100) e um nível CEFR estimado, restrito a A2/B1/B2/C1 (o produto nunca atende A1 nem avalia C2 no onboarding):
- precisão gramatical, naturalidade/registro, vocabulário ativo, fluência/coesão — para writing, baseie-se no texto real; para speaking, baseie-se só na escolha (a=A2/precário, b=A2-B1, c=B1-B2, d=B2-C1, como ponto de partida aproximado, ajuste com bom senso).
- "resumo": até 160 caracteres, específico e concreto (nunca um rótulo genérico tipo "B2").

Também retorne:
- "diagnostico": UMA frase curta (até 150 caracteres), tom direto e sem hype (mesmo estilo de "você entende quase tudo, mas ainda trava na hora de escrever ou falar" — sem elogio vazio, sem jargão de gramática), resumindo o diagnóstico geral pro usuário ver como resultado do onboarding.
- "itens_ledger": 1 a 2 padrões de erro notáveis observados APENAS no texto de writing (nunca invente erro de speaking, já que não há texto real de fala). Se o texto de writing estiver em branco ou não tiver erro claro, retorne array vazio. Para cada item: pattern (descrição curta do padrão), categoria, skill sempre "writing", exemplo_usuario (trecho real da resposta), forma_natural (como um nativo diria), porque (explicação de uma linha), dica (chip curtíssimo tipo "use: by + prazo", máximo 4 palavras).`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      temperature: 0,
      output_config: {
        format: { type: 'json_schema', schema: DIAGNOSTIC_SCHEMA },
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
    console.error('Diagnostic error:', error);
    return fallbackDiagnostic();
  }
}

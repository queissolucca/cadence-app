import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// As 5 tarefas fixas do diagnóstico (§3.1). Progressivas e curtas —
// duração alvo 6-8 min no total.
export const DIAGNOSTIC_TASKS = [
  {
    id: 'diag_w1',
    skill: 'writing',
    label: 'MENSAGEM NO SLACK',
    context: 'Um colega te chamou no Slack perguntando se você pode revisar o código dele hoje.',
    askPt: 'Responda de forma informal, dizendo que sim, mas só à tarde.',
  },
  {
    id: 'diag_w2',
    skill: 'writing',
    label: 'E-MAIL PEDINDO PRAZO',
    context: 'Você não vai conseguir terminar uma entrega no prazo combinado.',
    askPt: 'Escreva um email pedindo mais alguns dias.',
  },
  {
    id: 'diag_w3',
    skill: 'writing',
    label: 'ARGUMENTAR UMA OPINIÃO',
    context: 'Seu time está decidindo entre duas ferramentas para o projeto.',
    askPt: 'Escreva 4-5 frases defendendo sua opinião sobre qual usar (escolha qualquer justificativa plausível).',
  },
  {
    id: 'diag_s1',
    skill: 'speaking',
    label: 'SE APRESENTAR',
    context: 'Você está numa reunião com pessoas que não te conhecem.',
    askPt: 'Se apresente em 30 segundos: quem você é e o que faz.',
  },
  {
    id: 'diag_s2',
    skill: 'speaking',
    label: 'SITUAÇÃO INESPERADA',
    context: 'Seu voo foi cancelado em cima da hora.',
    askPt: 'Negocie com a atendente um novo voo.',
  },
];

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
        resumo: { type: 'string' },
      },
      required: ['precisao', 'naturalidade', 'vocabulario', 'fluencia', 'resumo'],
      additionalProperties: false,
    },
    speaking: {
      type: 'object',
      properties: {
        precisao: { type: 'integer' },
        naturalidade: { type: 'integer' },
        vocabulario: { type: 'integer' },
        fluencia: { type: 'integer' },
        resumo: { type: 'string' },
      },
      required: ['precisao', 'naturalidade', 'vocabulario', 'fluencia', 'resumo'],
      additionalProperties: false,
    },
    itens_ledger: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          categoria: { type: 'string' },
          skill: { type: 'string', enum: ['writing', 'speaking'] },
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
  required: ['writing', 'speaking', 'itens_ledger'],
  additionalProperties: false,
};

function fallbackDiagnostic() {
  const axes = { precisao: 50, naturalidade: 50, vocabulario: 50, fluencia: 50, resumo: 'Não foi possível avaliar agora — nível inicial padrão aplicado.' };
  return { writing: axes, speaking: { ...axes }, itens_ledger: [] };
}

// Uma ÚNICA chamada batch avalia as 5 tarefas juntas (§6.4) — nunca 5 calls.
export async function runDiagnostic(answers) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackDiagnostic();
  }

  const answersBlock = DIAGNOSTIC_TASKS.map((task) => {
    const text = answers[task.id] || '(em branco)';
    return `[${task.id} · ${task.skill}] ${task.context} → Pedido: ${task.askPt}\nResposta: ${text}`;
  }).join('\n\n');

  const prompt = `Você é um avaliador de proficiência em inglês para brasileiros, medindo (não perguntando) o nível real do aluno em 4 eixos — cada um de 0 a 100, com âncoras fixas (use-as como régua, não invente sua própria escala):

- precisão gramatical: 0-20 = erros que quebram a comunicação (tempo verbal, concordância básica); 21-45 = erros frequentes mas a mensagem passa; 46-70 = erros ocasionais em estruturas mais complexas (preposições, artigos, condicionais); 71-90 = poucos erros, nenhum que atrapalhe; 91-100 = precisão de nativo.
- naturalidade/registro: 0-20 = tradução literal do português, soa estranho; 21-45 = compreensível mas robótico ou register errado (formal demais/informal demais pro contexto); 46-70 = natural na maior parte, alguns trechos calcados no português; 71-90 = soa como nativo na maioria das situações; 91-100 = indistinguível de nativo.
- vocabulário ativo: 0-20 = vocabulário muito básico, repete as mesmas palavras; 21-45 = vocabulário funcional mas limitado, evita palavras que não domina; 46-70 = vocabulário variado para temas do dia a dia; 71-90 = vocabulário preciso e idiomático; 91-100 = vocabulário amplo com nuance.
- fluência/coesão: 0-20 = frases soltas, sem conectores; 21-45 = ideias conectadas de forma simples (and, but, so); 46-70 = coesão razoável com alguns conectores variados; 71-90 = texto/fala bem articulado e fluido; 91-100 = fluência total, transições sofisticadas.

As 3 primeiras respostas são de escrita (writing), as 2 últimas de fala transcrita (speaking). Avalie cada habilidade separadamente com base nas respostas correspondentes, comparando contra as âncoras acima — não contra uma impressão geral.

${answersBlock}

Retorne:
- "writing" e "speaking": os 4 eixos (0-100, usando as âncoras) + um "resumo" de até 200 caracteres, específico e concreto (ex: "seu writing formal está forte, mas comete erros de preposição por interferência do português"), nunca um rótulo genérico tipo "B2".
- "itens_ledger": entre 5 e 8 padrões de erro recorrentes observados nas respostas (não erros pontuais isolados). Para cada um: pattern (descrição curta do padrão), categoria, skill de origem, um exemplo_usuario (trecho real da resposta), forma_natural (como um nativo diria), porque (explicação de uma linha) e dica (chip curtíssimo tipo "use: by + prazo", máximo 4 palavras).`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 800,
      thinking: { type: 'disabled' },
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

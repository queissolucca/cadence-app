import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['good', 'minor', 'rework'] },
    natural: { type: 'string' },
    why: { type: 'string' },
    tip: { type: 'string' },
    learningPoint: { type: 'string' },
  },
  required: ['verdict', 'natural', 'why', 'tip', 'learningPoint'],
  additionalProperties: false,
};

export async function POST(request) {
  let mode, userText, scenario, memory;

  try {
    ({ mode, userText, scenario, memory } = await request.json());
  } catch {
    return NextResponse.json({
      verdict: 'rework',
      natural: "I'll help you improve that.",
      why: 'Não consegui ler os dados enviados pelo app.',
      tip: 'Tente novamente.',
      learningPoint: '',
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      verdict: 'rework',
      natural: scenario?.natural || "I'll help you improve that.",
      why: 'Claude não está configurado corretamente no backend. Verifique ANTHROPIC_API_KEY no Vercel e redeploy.',
      tip: 'Adicione ou atualize ANTHROPIC_API_KEY nas variáveis de ambiente do Vercel.',
      learningPoint: 'Sem a chave do Claude, o app não usa a IA real.',
    });
  }

  const prompt = `
Você é um coach de inglês para aprendizado prático e constante.

Objetivo: avaliar a resposta do usuário para um cenário específico e devolver:
- uma versão natural em inglês;
- um motivo claro da correção;
- uma dica curta para melhorar;
- um ponto de aprendizado.

Contexto do cenário:
- Tipo: ${mode}
- Contexto: ${scenario?.context || ''}
- Pedido: ${scenario?.askPt || ''}
- Resposta do usuário: ${userText}

Memória recente de aprendizado:
${(memory || []).map((item) => `- ${item.natural} | ${item.why || ''}`).join('\n')}

Avalie a resposta do usuário e retorne o resultado da correção.
Se a resposta do usuário estiver fora do contexto do cenário ou incorreta de forma grave, use "rework" como verdict.
`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 500,
      thinking: { type: 'disabled' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: RESULT_SCHEMA },
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

    const parsed = JSON.parse(textBlock.text);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Claude API error:', error);
    return NextResponse.json({
      verdict: 'rework',
      natural: scenario?.natural || "I'll help you improve that.",
      why: 'O Claude não conseguiu processar a requisição. Verifique a chave ANTHROPIC_API_KEY e o status da API.',
      tip: 'Confirme a variável de ambiente no Vercel e redeploy o app.',
      learningPoint: 'Respostas graves são classificadas como rework quando a IA não está disponível.',
    });
  }
}

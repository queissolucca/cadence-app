import Anthropic from '@anthropic-ai/sdk';
import { logUsage } from './usage';

// Server-only — nunca importar este arquivo de um componente 'use client'.
// A chave fica só em env do servidor; todo acesso passa por route handlers.
const client = new Anthropic();

// Haiku por decisão deliberada de custo/latência (mesmo racional já usado em
// lib/correct.js, lib/diagnostic.js, lib/roleplay.js). "claude-sonnet-4-6"
// não corresponde a nenhum modelo real da Anthropic hoje — os atuais são
// claude-haiku-4-5, claude-sonnet-5, claude-opus-4-8, claude-fable-5. Passe
// `model` explicitamente se quiser outro.
export const DEFAULT_MODEL = 'claude-haiku-4-5';

// Chamada JSON-only: sempre output_config json_schema (nunca markdown/texto
// livre), com 1 retry automático se o parse do JSON falhar.
export async function callClaudeJSON({ system, user, schema, model = DEFAULT_MODEL, maxTokens = 500, temperature = 0, meta = null }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY não configurada no backend.');
  }

  const request = {
    model,
    max_tokens: maxTokens,
    temperature,
    output_config: { format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: user }],
  };
  if (system) request.system = system;

  // Loga tokens (custo por usuário) quando meta = { supabase, userId, kind }.
  let uIn = 0;
  let uOut = 0;
  const flush = () => {
    if (meta?.supabase && meta?.userId && (uIn || uOut)) {
      logUsage(meta.supabase, meta.userId, { kind: meta.kind || 'json', model, inputTokens: uIn, outputTokens: uOut });
    }
  };

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await client.messages.create(request);
    uIn += response.usage?.input_tokens || 0;
    uOut += response.usage?.output_tokens || 0;

    if (response.stop_reason === 'refusal') {
      flush();
      throw new Error('Claude refused the request.');
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) {
      lastError = new Error('Claude did not return a text response.');
      continue;
    }

    try {
      const parsed = JSON.parse(textBlock.text);
      flush();
      return parsed;
    } catch (parseError) {
      lastError = parseError;
    }
  }

  flush();
  throw lastError || new Error('callClaudeJSON failed with no further detail.');
}

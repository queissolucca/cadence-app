// Server-only. Loga uso da API do Claude (tokens) por usuário, pra estimar
// custo. Best-effort: nunca derruba o request se falhar (ex.: tabela ainda não
// existe / migration 0022 não rodada).
export async function logUsage(supabase, userId, { provider = 'anthropic', kind, model = null, inputTokens = 0, outputTokens = 0, seconds = 0 } = {}) {
  if (!supabase || !userId || !kind) return;
  try {
    await supabase.from('usage_events').insert({
      user_id: userId,
      provider,
      kind,
      model,
      input_tokens: Math.max(0, Math.round(inputTokens || 0)),
      output_tokens: Math.max(0, Math.round(outputTokens || 0)),
      seconds: Math.max(0, Math.round(seconds || 0)),
    });
  } catch {
    /* best-effort */
  }
}

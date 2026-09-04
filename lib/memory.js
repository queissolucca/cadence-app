import { callClaudeJSON } from './anthropic';

// Server-only. Memória de usuário: extração (1 chamada Haiku por conversa) e
// carregamento do bloco compacto pra injetar no prompt dos agentes.

export const MEMORY_CAP = 40; // teto de fatos por usuário (controla tokens/custo)

export const CATEGORIES = [
  'location', 'work', 'hobbies', 'relationships', 'family',
  'finance', 'health', 'goals', 'preferences', 'other',
];

export const CATEGORY_LABELS = {
  location: 'Onde mora',
  work: 'Trabalho & carreira',
  hobbies: 'Hobbies & interesses',
  relationships: 'Relacionamentos',
  family: 'Família',
  finance: 'Finanças',
  health: 'Saúde & bem-estar',
  goals: 'Objetivos',
  preferences: 'Gostos & preferências',
  other: 'Outros',
};

const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    facts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: CATEGORIES },
          fact: { type: 'string' },
          importance: { type: 'integer' },
        },
        required: ['category', 'fact', 'importance'],
        additionalProperties: false,
      },
    },
  },
  required: ['facts'],
  additionalProperties: false,
};

// Lê a transcrição + o que já sabemos, e devolve fatos NOVOS pra salvar.
// Depois aplica o cap (mantém os 40 mais importantes/recentes).
export async function extractMemories(supabase, user, messages) {
  if (!process.env.ANTHROPIC_API_KEY) return { added: 0 };

  const lines = (messages || [])
    .filter((m) => m && m.text)
    .map((m) => `${m.role === 'you' ? 'User' : 'Coach'}: ${m.text}`)
    .join('\n')
    .slice(-6000);
  if (lines.length < 80) return { added: 0 };

  const { data: existing } = await supabase
    .from('user_memory')
    .select('fact, category')
    .eq('user_id', user.id);
  const known = (existing || []).map((m) => `- (${m.category}) ${m.fact}`).join('\n') || '(nenhuma ainda)';

  let result;
  try {
    result = await callClaudeJSON({
      system:
        'You extract durable, PERSONAL facts about a language-learning user from a conversation, so their AI English teacher can personalize future chats. Rules: return ONLY new facts that are not already known; each fact must be durable and about the person (where they live — city/state/country, work/career, hobbies & interests, relationships, family, finances, health, goals, tastes/preferences). Ignore small talk, one-off events, the weather, and anything about English/grammar/the lesson itself. Write each fact as a short third-person statement in Portuguese. Give a category and an importance from 1 to 5 (5 = very defining). If there is nothing new and durable, return an empty list.',
      user: `Fatos já conhecidos:\n${known}\n\nNova conversa:\n${lines}\n\nRetorne só fatos pessoais novos e duráveis.`,
      schema: EXTRACT_SCHEMA,
      maxTokens: 500,
      temperature: 0,
      meta: { supabase, userId: user.id, kind: 'memory_extract' },
    });
  } catch {
    return { added: 0 };
  }

  const facts = Array.isArray(result?.facts) ? result.facts.slice(0, 15) : [];
  const rows = facts
    .filter((f) => f && typeof f.fact === 'string' && f.fact.trim())
    .map((f) => ({
      user_id: user.id,
      category: CATEGORIES.includes(f.category) ? f.category : 'other',
      fact: f.fact.trim().slice(0, 300),
      importance: Number.isInteger(f.importance) ? Math.max(1, Math.min(5, f.importance)) : 3,
    }));
  if (!rows.length) return { added: 0 };

  await supabase.from('user_memory').insert(rows);

  // Cap: mantém os MEMORY_CAP mais importantes / recentes; apaga o excedente.
  const { data: all } = await supabase
    .from('user_memory')
    .select('id')
    .eq('user_id', user.id)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false });
  if (all && all.length > MEMORY_CAP) {
    const excess = all.slice(MEMORY_CAP).map((r) => r.id);
    if (excess.length) await supabase.from('user_memory').delete().eq('user_id', user.id).in('id', excess);
  }

  return { added: rows.length };
}

// Bloco compacto (só os top `max` por importância) pra injetar no prompt.
// Retorna '' se não houver memória — o agente segue normal.
export async function loadMemoryBlock(supabase, userId, max = MEMORY_CAP) {
  const { data, error } = await supabase
    .from('user_memory')
    .select('fact, importance, created_at')
    .eq('user_id', userId)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(max);
  if (error || !data || !data.length) return '';
  return data.map((m) => `- ${m.fact}`).join('\n');
}

// Saudação inicial personalizada (voz e texto). Abre a conversa puxando UM fato
// da memória, de preferência ligado ao dia da semana (ex.: "hoje é quarta, dia
// que você corre"). Sem memória → '' e o cliente usa a saudação padrão, direta
// e normal (nada de inventar sobre quem não tem nada gravado).
export async function buildOpeningGreeting(supabase, userId, firstName, memoryText, today) {
  if (!memoryText || !process.env.ANTHROPIC_API_KEY) return '';
  const weekday = (today && today.weekday) || '';
  try {
    const res = await callClaudeJSON({
      system:
        "You write Cady's very first SPOKEN line greeting a returning English student at the start of a new conversation. Cady is a warm, upbeat AI English teacher. Rules: keep it to 1-2 short, natural spoken sentences. Greet them by first name, then naturally bring up ONE specific thing you remember about them from the notes — if something ties to today's weekday (a routine they do on this day), strongly prefer that. Make it feel like a friend who remembers, not a database readout. Never mention that you have 'notes', 'memory' or 'records'. End by inviting them to talk. If nothing in the notes fits naturally, just give a warm, normal greeting. Output only the line, in English.",
      user: `Student first name: ${firstName || 'there'}\nToday is ${weekday}.\nThings you remember about them:\n${memoryText}`,
      schema: { type: 'object', properties: { line: { type: 'string' } }, required: ['line'], additionalProperties: false },
      maxTokens: 120,
      temperature: 0.7,
      meta: { supabase, userId, kind: 'greeting' },
    });
    return (res?.line || '').trim().slice(0, 400);
  } catch {
    return '';
  }
}

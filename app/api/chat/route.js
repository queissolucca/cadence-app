import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const client = new Anthropic();
const MODEL = 'claude-haiku-4-5'; // texto: Haiku por custo/latência
const CATEGORIES = ['correction', 'phrase', 'word'];

// A Cady salva na Revisão via tool (server-side): mais limpo que a client tool
// do voice — grava direto no Supabase e o loop continua.
const SAVE_TOOL = {
  name: 'save_to_review',
  description:
    "Save a word, phrase, or correction to the user's spaced-repetition review list (the Revisão tab). Call it when the user asks to save/memorize something, and also automatically right after you make a real correction worth practicing.",
  input_schema: {
    type: 'object',
    properties: {
      term: { type: 'string', description: 'The exact word, phrase, or corrected/native form to save, in English.' },
      example: { type: 'string', description: 'A short, natural example sentence in English using the term.' },
      category: { type: 'string', enum: CATEGORIES, description: 'One of: correction, phrase, word. Use "correction" when fixing a mistake.' },
    },
    required: ['term'],
  },
};

function systemPrompt(name) {
  const who = name || 'there';
  return `You are Cady, a warm, sharp English teacher from North America (US/Canada). You're texting with ${who}, a Brazilian learner (Portuguese is their first language) who wants to reach native-sounding English.

# Rules
- Reply ONLY in English — always. If ${who} writes in Portuguese, don't switch: answer in English and hand them the English phrasing they were reaching for.
- Sound like a real North American: contractions, phrasal verbs, natural slang ("no worries", "for sure", "gonna", "my bad"). Not a textbook.
- Keep replies SHORT — 1 to 3 sentences. It's a back-and-forth; ${who} should do most of the writing, so ask a follow-up often.
- Light formatting is okay (you're on text), but keep it clean — no long blocks, no bullet dumps.

# Corrections (the important part)
- Don't nitpick everything — fix what blocks meaning, sounds translated from Portuguese, or keeps repeating. Do it fast, in the flow, then keep going.
- Whenever you make a REAL correction, call the save_to_review tool with category "correction", the corrected/native form, and a short example — quietly, WITHOUT announcing you saved it. Save each thing only once; skip trivial slips.
- If ${who} asks to save/memorize a word or phrase, use the same tool.

# Tone
Encouraging, real, a little funny. Celebrate wins, normalize mistakes, never condescending.`;
}

// Modo LIÇÃO (trilha por escrita): drill focado no alvo da unidade, não papo.
function lessonPrompt(name, unit) {
  const who = name || 'there';
  return `You are Cady, a warm, sharp North American (US/Canada) English teacher. You're running a focused WRITING drill with ${who}, a Brazilian learner (Portuguese is their first language) — this is a lesson, not open chat. Everything is over text.

# The drill
- Target: ${unit.focus}. Context: ${unit.context}. What to drill: ${unit.drill}
- The opening message already gave an example and asked ${who} to produce one. Jump straight to making them WRITE the target, again and again, in different little contexts.
- Keep replies SHORT (1-2 sentences): quick reaction, correct if needed, then the next little prompt to produce the target again.
- Give them a real workout: aim for about 6 to 8 good productions of the target before wrapping up — do NOT stop after two or three.

# Corrections
- Fix mistakes on the target (and anything that blocks meaning) fast and inline. Whenever you make a REAL correction, call the save_to_review tool (category "correction") with the corrected form and a short example — quietly, WITHOUT announcing it. Save each once; skip trivial slips.

# Wrapping up
- After ~6-8 good tries, give a warm one-line closing: celebrate the work, and tell them they can drill it again, try it in Conversa aberta, or head to the next lesson. Then you're done.

# Rules
- Reply ONLY in English. Sound like a real North American (contractions, natural slang), not a textbook. Encouraging, never condescending. Light formatting only — no long blocks.`;
}

function parseUnit(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const s = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  const title = s(raw.title, 120);
  const focus = s(raw.focus, 200);
  if (!focus && !title) return null;
  return { title, focus, context: s(raw.context, 200), drill: s(raw.drill, 600) };
}

// Normaliza o histórico vindo do cliente pro formato da Anthropic.
function toAnthropicMessages(raw) {
  const arr = Array.isArray(raw) ? raw.slice(-20) : [];
  const out = [];
  for (const m of arr) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = typeof m.content === 'string' ? m.content.slice(0, 2000) : '';
    if (content) out.push({ role, content });
  }
  // A Anthropic exige o 1º turno como 'user' — descarta saudações iniciais da
  // Cady (assistant) que possam vir na frente.
  while (out.length && out[0].role === 'assistant') out.shift();
  return out;
}

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const messages = toAnthropicMessages(body.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'no_user_message' }, { status: 400 });
  }

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || '';

  const unit = parseUnit(body.unit);
  const system = unit ? lessonPrompt(firstName, unit) : systemPrompt(firstName);

  const convo = [...messages];
  const saved = [];

  try {
    // Loop de tool use: a Cady pode salvar 1+ itens antes de responder em texto.
    for (let step = 0; step < 4; step += 1) {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 400,
        temperature: 0.7,
        system,
        tools: [SAVE_TOOL],
        messages: convo,
      });

      const toolUses = (resp.content || []).filter((b) => b.type === 'tool_use');
      if (resp.stop_reason === 'tool_use' && toolUses.length) {
        convo.push({ role: 'assistant', content: resp.content });
        const results = [];
        for (const tu of toolUses) {
          const { term, example, category } = tu.input || {};
          let ok = false;
          if (term && typeof term === 'string') {
            const cat = CATEGORIES.includes(category) ? category : 'correction';
            const { error } = await supabase.from('review_saved').insert({
              user_id: user.id,
              term: term.slice(0, 200),
              example: typeof example === 'string' ? example.slice(0, 400) : null,
              category: cat,
            });
            ok = !error;
            if (ok) saved.push({ term: term.slice(0, 200), category: cat });
          }
          results.push({ type: 'tool_result', tool_use_id: tu.id, content: ok ? 'Saved to review.' : 'Could not save.' });
        }
        convo.push({ role: 'user', content: results });
        continue;
      }

      const text = (resp.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return NextResponse.json({ reply: text || "Go on — tell me more!", saved });
    }

    return NextResponse.json({ reply: "Let's keep going — what's on your mind?", saved });
  } catch (err) {
    console.error('chat error:', err);
    return NextResponse.json({ error: 'chat_failed' }, { status: 500 });
  }
}

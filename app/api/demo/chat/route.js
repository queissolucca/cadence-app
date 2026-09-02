import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { allowDemo } from '../../../../lib/demoRate';

export const dynamic = 'force-dynamic';

const client = new Anthropic();
const MODEL = 'claude-haiku-4-5';

function demoPrompt() {
  return `You are Cady, a warm North American (US/Canada) English teacher giving a 30-second TASTE of a lesson to a visitor who hasn't signed up yet (a Brazilian, Portuguese is their first language). Goal: make them FEEL the value fast.
- Reply ONLY in English, SHORT (1-2 sentences), warm and encouraging, natural (contractions, light slang).
- Every time they write, react and slip in ONE quick friendly correction or a more natural upgrade — show the magic of in-the-moment fixes.
- Keep it to about 3 exchanges. On the 3rd, celebrate warmly (like "you just had a real conversation in English!") and gently stop — don't ask more questions.
- Never mention price, payment, or signing up. Just teach and be delightful.`;
}

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ reply: "Hey! I'm Cady — try saying hi in English!" });
  }
  const gate = await allowDemo(request, 'text', 8); // até 8 mensagens de texto por hora/IP
  if (!gate.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const msgs = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-8)
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content.slice(0, 1000) }));
  while (msgs.length && msgs[0].role === 'assistant') msgs.shift();
  if (!msgs.length) return NextResponse.json({ error: 'no_message' }, { status: 400 });

  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      temperature: 0.7,
      system: demoPrompt(),
      messages: msgs,
    });
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return NextResponse.json({ reply: text || "You're doing great — keep going!" });
  } catch {
    return NextResponse.json({ error: 'chat_failed' }, { status: 500 });
  }
}

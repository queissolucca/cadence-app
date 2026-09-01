import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { callClaudeJSON } from '../../../../lib/anthropic';

export const dynamic = 'force-dynamic';

const SCHEMA = {
  type: 'object',
  properties: { example: { type: 'string' } },
  required: ['example'],
  additionalProperties: false,
};

// POST { term } → gera 1 frase de exemplo natural do dia a dia usando o termo
// (Claude Haiku). Usado pelo botão "Gerar exemplo de uso" no add da Revisão.
export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const term = typeof body.term === 'string' ? body.term.trim().slice(0, 200) : '';
  if (!term) return NextResponse.json({ error: 'missing_term' }, { status: 400 });

  try {
    const res = await callClaudeJSON({
      system:
        'You write ONE short, natural, everyday English example sentence that uses the given English word or phrase exactly as a native speaker really would in daily life. Make it concrete — a real situation (work, home, friends, travel, ordering food…), not a dictionary definition. Under 15 words. Return just the sentence.',
      user: `Word or phrase: "${term}"`,
      schema: SCHEMA,
      maxTokens: 120,
      temperature: 0.7,
      meta: { supabase, userId: user.id, kind: 'example_gen' },
    });
    const example = typeof res?.example === 'string' ? res.example.trim().slice(0, 400) : '';
    if (!example) return NextResponse.json({ error: 'no_example' }, { status: 500 });
    return NextResponse.json({ example });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

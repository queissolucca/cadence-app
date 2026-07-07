import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { callClaudeJSON } from '../../../lib/anthropic';

const SCHEMA = {
  type: 'object',
  properties: { question: { type: 'string' } },
  required: ['question'],
  additionalProperties: false,
};

const FALLBACK_QUESTION = 'Your manager asks: "Can you update me on the project?" — answer in English.';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('baseline_question').eq('id', user.id).maybeSingle();
  if (profile?.baseline_question) {
    return NextResponse.json({ baseline_question: profile.baseline_question });
  }

  const system = 'Você gera UMA pergunta de baseline em inglês, ligada a um contexto de trabalho, pra medir o nível inicial de um aluno brasileiro de inglês antes dele começar a praticar. Isso é só um norte, não uma avaliação precisa.';
  const userPrompt = 'Gere uma pergunta curta em inglês no formato de uma situação real de trabalho (ex: \'Your manager asks: "Can you update me on the project?" — answer in English.\'), pedindo pro aluno responder em inglês.';

  let question;
  try {
    const result = await callClaudeJSON({ system, user: userPrompt, schema: SCHEMA, maxTokens: 150 });
    question = result.question;
  } catch (err) {
    console.error('baseline question generation failed:', err);
    question = FALLBACK_QUESTION;
  }

  const { error } = await supabase.from('profiles').update({ baseline_question: question }).eq('id', user.id);
  if (error) {
    return NextResponse.json({ error: 'save_failed', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ baseline_question: question });
}

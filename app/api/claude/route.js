import { NextResponse } from 'next/server';
import { gradeAnswer } from '../../../lib/grade';

// Grading "puro" (sem persistência) — mantido por compatibilidade. O fluxo
// principal do app usa /api/exercise/submit, que também grava no Supabase.
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

  const feedback = await gradeAnswer({ mode, userText, scenario, memory });
  return NextResponse.json(feedback);
}

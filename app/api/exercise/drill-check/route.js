import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { checkDrillAnswer } from '../../../../lib/correct';

export const maxDuration = 15;

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { skill, hint, answerText } = body;
  if (!answerText || (skill !== 'writing' && skill !== 'speaking')) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const result = await checkDrillAnswer({ skill, hint, answerText });
  return NextResponse.json(result);
}

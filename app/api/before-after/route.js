import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getBeforeAfterAvailability, runBeforeAfterCheck } from '../../../lib/beforeAfter';
import { completeSession } from '../../../lib/sessionComplete';

export const maxDuration = 20;

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

  const answer = (body.answer || '').trim();
  if (!answer) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const { available, hasBaseline } = await getBeforeAfterAvailability(supabase, user);
  if (!hasBaseline) {
    return NextResponse.json({ error: 'no_baseline' }, { status: 400 });
  }
  if (!available) {
    return NextResponse.json({ error: 'not_available_yet' }, { status: 403 });
  }

  const result = await runBeforeAfterCheck(supabase, user, answer);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const sessionResult = await completeSession(supabase, user, { kind: 'baseline', mode: null, duration_seconds: 0, items_total: 1, items_correct: 0 });

  return NextResponse.json({ check: result.check, annotated: result.annotated, session: sessionResult });
}

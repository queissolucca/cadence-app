import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { completeSession } from '../../../../lib/sessionComplete';

const VALID_KINDS = ['daily', 'weak_training', 'roleplay', 'baseline'];
const VALID_MODES = ['writing', 'speaking', 'mixed'];

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

  const { kind, mode, duration_seconds, items_total, items_correct } = body;
  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  if (mode && !VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: 'invalid_mode' }, { status: 400 });
  }

  const result = await completeSession(supabase, user, { kind, mode, duration_seconds, items_total, items_correct });
  return NextResponse.json(result);
}

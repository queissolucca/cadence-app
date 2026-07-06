import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

const VALID_TIMING = ['inline', 'end_of_exercise'];
const VALID_DEPTH = ['explain_always', 'flag_only'];

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

  const update = {};
  if (body.correctionTiming) {
    if (!VALID_TIMING.includes(body.correctionTiming)) {
      return NextResponse.json({ error: 'invalid_correction_timing' }, { status: 400 });
    }
    update.correction_timing = body.correctionTiming;
  }
  if (body.correctionDepth) {
    if (!VALID_DEPTH.includes(body.correctionDepth)) {
      return NextResponse.json({ error: 'invalid_correction_depth' }, { status: 400 });
    }
    update.correction_depth = body.correctionDepth;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

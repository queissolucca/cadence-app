import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

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

  const { weeklyCadence, track } = body;
  if (![3, 5, 7].includes(weeklyCadence) || !track) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  await supabase
    .from('profiles')
    .update({
      weekly_cadence_target: weeklyCadence,
      current_track: track,
      current_stage: 1,
      diagnostic_completed: true,
    })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}

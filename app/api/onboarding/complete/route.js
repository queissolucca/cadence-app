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

  // O client do Supabase NÃO lança erro em `.update()` — precisa checar
  // `error` explicitamente, senão uma falha (RLS, rede, 0 linhas afetadas)
  // passa batido e o front acha que salvou quando não salvou nada.
  const { data, error } = await supabase
    .from('profiles')
    .update({
      weekly_cadence_target: weeklyCadence,
      current_track: track,
      current_stage: 1,
      diagnostic_completed: true,
    })
    .eq('id', user.id)
    .select('id');

  if (error) {
    console.error('onboarding/complete update error:', error);
    return NextResponse.json({ error: 'update_failed', details: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    console.error('onboarding/complete: update matched 0 rows for user', user.id);
    return NextResponse.json({ error: 'no_rows_updated' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

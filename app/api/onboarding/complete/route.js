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

  // Upsert em vez de update: se por qualquer motivo a linha do profile não
  // bater 1:1 (corrida com o trigger de signup, cache, etc.), isso garante
  // que os dados sejam gravados de qualquer forma, em vez de silenciosamente
  // não afetar nenhuma linha.
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        weekly_cadence_target: weeklyCadence,
        current_track: track,
        current_stage: 1,
        diagnostic_completed: true,
      },
      { onConflict: 'id' },
    )
    .select('id');

  if (error) {
    console.error('onboarding/complete upsert error:', error);
    return NextResponse.json({ error: 'update_failed', details: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    console.error('onboarding/complete: upsert returned 0 rows for user', user.id);
    return NextResponse.json({ error: 'no_rows_updated' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

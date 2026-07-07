import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { invalidateTodayContent } from '../../../../lib/dailyContent';

// Troca o cenário do dia — invalida o daily_content de hoje (a próxima
// chamada de /api/daily regenera do zero pro cenário novo).
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

  const { scenario_id } = body;
  if (!scenario_id) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const { error } = await supabase.from('profiles').update({ active_scenario_id: scenario_id }).eq('id', user.id);
  if (error) {
    return NextResponse.json({ error: 'update_failed', details: error.message }, { status: 500 });
  }

  await invalidateTodayContent(supabase, user.id);

  return NextResponse.json({ ok: true });
}

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

  const answer = (body.answer || '').trim();
  if (!answer) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const { error: saveError } = await supabase
    .from('profiles')
    .update({ baseline_answer: answer, baseline_date: new Date().toISOString().slice(0, 10) })
    .eq('id', user.id);

  if (saveError) {
    return NextResponse.json({ error: 'save_failed', details: saveError.message }, { status: 500 });
  }

  // (d) cenário de stage 1 vira 'current' e ganha active_scenario_id; os
  // demais entram como 'locked'.
  const { data: firstScenario } = await supabase.from('scenarios').select('id').eq('stage', 1).maybeSingle();
  if (firstScenario) {
    await supabase.from('profiles').update({ active_scenario_id: firstScenario.id }).eq('id', user.id);

    await supabase.from('user_scenario_state').upsert(
      { user_id: user.id, scenario_id: firstScenario.id, mastered_count: 0, status: 'current', updated_at: new Date().toISOString() },
      { onConflict: 'user_id,scenario_id' },
    );

    const { data: otherScenarios } = await supabase.from('scenarios').select('id').neq('id', firstScenario.id);
    if (otherScenarios?.length) {
      const rows = otherScenarios.map((s) => ({
        user_id: user.id, scenario_id: s.id, mastered_count: 0, status: 'locked', updated_at: new Date().toISOString(),
      }));
      await supabase.from('user_scenario_state').upsert(rows, { onConflict: 'user_id,scenario_id' });
    }
  }

  return NextResponse.json({ ok: true });
}

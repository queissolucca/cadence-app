import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { invalidateTodayContent } from '../../../../lib/dailyContent';
import { computeScenarioStatuses } from '../../../../lib/scenarioProgress';

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

  // A UI já só oferece cenários desbloqueados, mas confia no client é
  // errado — reconfirma aqui antes de trocar.
  const [{ data: scenarios }, { data: stateRows }] = await Promise.all([
    supabase.from('scenarios').select('id, target_phrases, stage'),
    supabase.from('user_scenario_state').select('scenario_id, mastered_count').eq('user_id', user.id),
  ]);
  const stateByScenarioId = {};
  (stateRows || []).forEach((row) => { stateByScenarioId[row.scenario_id] = { masteredCount: row.mastered_count }; });
  const statuses = computeScenarioStatuses(scenarios || [], stateByScenarioId);
  if (statuses[scenario_id]?.status === 'locked') {
    return NextResponse.json({ error: 'scenario_locked' }, { status: 403 });
  }

  const { error } = await supabase.from('profiles').update({ active_scenario_id: scenario_id }).eq('id', user.id);
  if (error) {
    return NextResponse.json({ error: 'update_failed', details: error.message }, { status: 500 });
  }

  await invalidateTodayContent(supabase, user.id);

  return NextResponse.json({ ok: true });
}

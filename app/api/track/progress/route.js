import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET → ids das unidades já concluídas pelo usuário (pra pintar os checks na
// trilha). POST → marca uma unidade como concluída (incrementa `times`).
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { data, error } = await supabase.from('unit_progress').select('unit_id').eq('user_id', user.id);
  if (error) return NextResponse.json({ completed: [] }); // tabela pode não existir ainda
  return NextResponse.json({ completed: (data || []).map((r) => r.unit_id) });
}

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const unitId = typeof body.unit_id === 'string' ? body.unit_id.slice(0, 40) : '';
  if (!unitId) return NextResponse.json({ error: 'missing_unit' }, { status: 400 });

  const { data: existing } = await supabase
    .from('unit_progress')
    .select('times')
    .eq('user_id', user.id)
    .eq('unit_id', unitId)
    .maybeSingle();

  const times = (existing?.times || 0) + 1;
  const { error } = await supabase
    .from('unit_progress')
    .upsert({ user_id: user.id, unit_id: unitId, times, completed_at: new Date().toISOString() }, { onConflict: 'user_id,unit_id' });

  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  return NextResponse.json({ ok: true, times });
}

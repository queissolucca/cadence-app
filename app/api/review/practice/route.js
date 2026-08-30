import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { nextState } from '../../../../lib/track/srs';

export const dynamic = 'force-dynamic';

// POST { ids: [...] } → o usuário revisou esses itens FALANDO com a Cady.
// Conta como um acerto ('good') pra cada um: sobe de caixa e reagenda (ou
// gradua). Usado ao encerrar a sessão "Praticar com a Cady".
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

  const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === 'string').slice(0, 30) : [];
  if (!ids.length) return NextResponse.json({ ok: true, updated: 0 });

  const { data: rows } = await supabase
    .from('review_saved')
    .select('id, box')
    .eq('user_id', user.id)
    .in('id', ids);

  let updated = 0;
  for (const row of rows || []) {
    const next = nextState(row.box ?? 1, 'good');
    const patch = { box: next.box, status: next.status };
    if (next.due_at) patch.due_at = next.due_at;
    const { error } = await supabase
      .from('review_saved')
      .update(patch)
      .eq('user_id', user.id)
      .eq('id', row.id);
    if (!error) updated += 1;
  }

  return NextResponse.json({ ok: true, updated });
}

import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { nextState } from '../../../../lib/track/srs';

export const dynamic = 'force-dynamic';

const RATINGS = ['again', 'good', 'easy'];

// PATCH → duas formas:
//   • { rating: 'again'|'good'|'easy' } — nota de um flashcard: aplica o SRS
//     (sobe/desce de caixa, agenda a próxima revisão, gradua na caixa 5).
//   • { status: 'active'|'learned' } — "já sei" / revisar de novo, manual.
// DELETE → remove o item de vez.
export async function PATCH(request, { params }) {
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

  if (RATINGS.includes(body.rating)) {
    const { data: cur } = await supabase
      .from('review_saved')
      .select('box')
      .eq('user_id', user.id)
      .eq('id', params.id)
      .maybeSingle();
    const next = nextState(cur?.box ?? 1, body.rating);
    const patch = { box: next.box, status: next.status };
    if (next.due_at) patch.due_at = next.due_at;

    const { error } = await supabase
      .from('review_saved')
      .update(patch)
      .eq('user_id', user.id)
      .eq('id', params.id);
    if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    return NextResponse.json({ ok: true, box: next.box, status: next.status, graduated: next.graduated });
  }

  const status = body.status === 'learned' ? 'learned' : 'active';
  const { error } = await supabase
    .from('review_saved')
    .update({ status })
    .eq('user_id', user.id)
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { error } = await supabase
    .from('review_saved')
    .delete()
    .eq('user_id', user.id)
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

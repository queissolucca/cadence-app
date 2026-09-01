import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { CATEGORIES } from '../../../../lib/memory';

export const dynamic = 'force-dynamic';

// PATCH → edita o texto e/ou a categoria de um fato (precisa da policy de UPDATE,
// migration 0021).
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

  const patch = {};
  if (typeof body.fact === 'string' && body.fact.trim()) patch.fact = body.fact.trim().slice(0, 300);
  if (CATEGORIES.includes(body.category)) patch.category = body.category;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });

  const { error } = await supabase
    .from('user_memory')
    .update(patch)
    .eq('user_id', user.id)
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE → apaga um fato de memória (o usuário pode remover o que quiser).
export async function DELETE(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { error } = await supabase
    .from('user_memory')
    .delete()
    .eq('user_id', user.id)
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

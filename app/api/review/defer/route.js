import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

// "Travou? ver frase-modelo" (só disponível pra itens de revisão, que já
// têm content.forma_natural salvo) — NÃO conta como acerto nem chama
// /api/evaluate. Só empurra a revisão pra amanhã, sem tocar em stage/
// times_seen/times_correct (não é uma tentativa real).
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

  const { phrase_id } = body;
  if (!phrase_id) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const { error } = await supabase
    .from('review_items')
    .update({ next_review_at: tomorrow, updated_at: new Date().toISOString() })
    .eq('id', phrase_id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'update_failed', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deferredTo: tomorrow });
}

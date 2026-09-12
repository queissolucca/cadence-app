import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET → uma conversa com o transcript completo (pra abrir no viewer).
// DELETE → apaga a conversa (RLS garante que só a própria).
export async function GET(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, theme, started_at, messages')
    .eq('user_id', user.id)
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ conversation: data });
}

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
  /* Atualizar as falas. Dois usos: retomar uma conversa antiga, e — desde que a
     voz passou a gravar turno a turno em vez de só no fim — a própria conversa em
     andamento, que chama isto a cada fala nova.

     `duration_seconds` só vem no FECHO. Durante a conversa ele não é mandado, e
     por isso não pode ser sobrescrito com zero a cada turno: uma conversa de meia
     hora ficaria registrada como 0 segundo, e é ela que alimenta o streak. */
  if (Array.isArray(body.messages)) {
    const messages = body.messages;
    const patch = {
      messages,
      turn_count: messages.length,
      ended_at: body.ended_at || new Date().toISOString(),
    };
    if (Number.isFinite(body.duration_seconds) && body.duration_seconds >= 0) {
      patch.duration_seconds = Math.round(body.duration_seconds);
    }
    // O título também só vem no fecho, e pelo mesmo motivo: ele é derivado da
    // conversa, e no começo ainda não há conversa da qual derivar.
    if (typeof body.title === 'string' && body.title.trim()) {
      patch.title = body.title.trim().slice(0, 120);
    }
    const { error } = await supabase
      .from('conversations')
      .update(patch)
      .eq('user_id', user.id)
      .eq('id', params.id);
    if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Fixar/desafixar (limite de 3 por usuário).
  if (typeof body.pinned === 'boolean') {
    if (body.pinned) {
      const { count } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('pinned', true);
      if ((count || 0) >= 3) return NextResponse.json({ error: 'max_pins' }, { status: 409 });
    }
    const { error } = await supabase
      .from('conversations')
      .update({ pinned: body.pinned })
      .eq('user_id', user.id)
      .eq('id', params.id);
    if (error) return NextResponse.json({ error: 'pin_failed' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
}

export async function DELETE(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('user_id', user.id)
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

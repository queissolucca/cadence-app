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

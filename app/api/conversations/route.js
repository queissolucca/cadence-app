import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET → lista as conversas do usuário pra barra lateral (sem o transcript
// inteiro, pra ser leve). POST → salva uma conversa encerrada.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  let { data, error } = await supabase
    .from('conversations')
    .select('id, title, theme, started_at, turn_count, pinned')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(200);

  if (error) {
    // A coluna 'pinned' pode ainda não existir (migration 0014) — fallback.
    const fb = await supabase
      .from('conversations')
      .select('id, title, theme, started_at, turn_count')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(200);
    if (fb.error) return NextResponse.json({ error: 'list_failed' }, { status: 500 });
    data = (fb.data || []).map((c) => ({ ...c, pinned: false }));
  }

  return NextResponse.json({ conversations: data || [] });
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

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      started_at: body.started_at || new Date().toISOString(),
      ended_at: body.ended_at || new Date().toISOString(),
      title: (body.title || 'Conversa').slice(0, 120),
      theme: body.theme || null,
      turn_count: messages.length,
      duration_seconds: body.duration_seconds || 0,
      messages,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

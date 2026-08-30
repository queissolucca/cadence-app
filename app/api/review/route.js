import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['correction', 'phrase', 'word'];

// GET → todos os itens de revisão do usuário. POST → salva um item (via comando
// de voz na conversa ou pelo add manual).
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('review_saved')
    .select('id, term, example, note, category, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ items: [] }); // tabela pode não existir ainda
  return NextResponse.json({ items: data || [] });
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

  const term = typeof body.term === 'string' ? body.term.trim().slice(0, 200) : '';
  if (!term) return NextResponse.json({ error: 'missing_term' }, { status: 400 });
  const category = CATEGORIES.includes(body.category) ? body.category : 'phrase';

  const { data, error } = await supabase
    .from('review_saved')
    .insert({
      user_id: user.id,
      term,
      example: typeof body.example === 'string' ? body.example.slice(0, 400) : null,
      note: typeof body.note === 'string' ? body.note.slice(0, 400) : null,
      category,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

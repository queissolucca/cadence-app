import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { CATEGORIES } from '../../../lib/memory';

export const dynamic = 'force-dynamic';

// GET → lista as memórias do usuário (pra tela "Suas memórias" em Ajustes).
// best-effort: se a tabela ainda não existe (migration 0020), devolve vazio.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_memory')
    .select('id, category, fact, importance, created_at')
    .eq('user_id', user.id)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ memories: [] });
  return NextResponse.json({ memories: data || [] });
}

// POST → o usuário adiciona uma memória manualmente (com categoria escolhida).
// Importância 4 (curada pelo usuário = priorizada na injeção).
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

  const fact = typeof body.fact === 'string' ? body.fact.trim().slice(0, 300) : '';
  if (!fact) return NextResponse.json({ error: 'missing_fact' }, { status: 400 });
  const category = CATEGORIES.includes(body.category) ? body.category : 'other';

  const { data, error } = await supabase
    .from('user_memory')
    .insert({ user_id: user.id, category, fact, importance: 4 })
    .select('id, category, fact, importance, created_at')
    .single();

  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  return NextResponse.json({ memory: data });
}

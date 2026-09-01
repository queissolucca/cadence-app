import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

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

import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 20).map((x) => x.slice(0, 200)) : []);
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null);

// POST → salva as respostas do onboarding do usuário e marca profiles.onboarded_at.
// Também semeia a memória da Cady (nível + motivos) pra ela já personalizar.
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

  const row = {
    user_id: user.id,
    age: str(body.age, 40),
    gender: str(body.gender, 40),
    level: str(body.level, 200),
    reasons: arr(body.reasons),
    challenges: arr(body.challenges),
    daily_goal: str(body.dailyGoal, 40),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('onboarding').upsert(row, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: 'save_failed', details: error.message }, { status: 500 });

  // marca como onboarded (best-effort — coluna pode não existir antes da migration)
  await supabase.from('profiles').update({ onboarded_at: new Date().toISOString() }).eq('id', user.id);

  // semeia a memória da Cady (best-effort) pra ela já conhecer o usuário
  try {
    const facts = [];
    if (row.level) facts.push({ user_id: user.id, category: 'goals', fact: `Nível de inglês (autoavaliado): ${row.level.replace(/\.$/, '')}`, importance: 5 });
    if (row.daily_goal) facts.push({ user_id: user.id, category: 'goals', fact: `Meta diária: ${row.daily_goal}`, importance: 4 });
    (row.reasons || []).slice(0, 3).forEach((r) => facts.push({ user_id: user.id, category: 'goals', fact: `Quer aprender inglês para: ${r.replace(/\.$/, '')}`, importance: 4 }));
    (row.challenges || []).slice(0, 2).forEach((c) => facts.push({ user_id: user.id, category: 'other', fact: `Desafio com o inglês: ${c.replace(/\.$/, '')}`, importance: 4 }));
    if (facts.length) await supabase.from('user_memory').insert(facts);
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// Atualiza nome e/ou foto do próprio perfil. A foto vem como data URL compacto
// (redimensionado no cliente), então cabe direto no avatar_url — sem Storage.
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

  const update = {};
  if (typeof body.full_name === 'string') update.full_name = body.full_name.slice(0, 80);
  // Cap de ~200KB pro data URL (uma foto 256px fica bem abaixo disso).
  if (typeof body.avatar_url === 'string' && body.avatar_url.startsWith('data:image/') && body.avatar_url.length < 200000) {
    update.avatar_url = body.avatar_url;
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

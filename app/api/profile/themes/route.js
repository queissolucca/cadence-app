import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

const MAX_EXTRA_THEMES = 2;

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

  const themeIds = Array.isArray(body.themeIds) ? body.themeIds.slice(0, MAX_EXTRA_THEMES) : [];

  const { error: deleteError } = await supabase.from('user_theme_selection').delete().eq('user_id', user.id);
  if (deleteError) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  if (themeIds.length > 0) {
    const rows = themeIds.map((trackId, idx) => ({ user_id: user.id, track_id: trackId, priority: idx + 1 }));
    const { error: insertError } = await supabase.from('user_theme_selection').insert(rows);
    if (insertError) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, themeIds });
}

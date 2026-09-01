import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST { event, path, utm:{source,medium,campaign}, referrer, meta } → registra
// uma interação do usuário logado. Best-effort (nunca quebra a navegação).
export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true }); // só loga logado (RLS)

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const s = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null);
  const utm = body.utm || {};
  const row = {
    user_id: user.id,
    event: s(body.event, 40) || 'event',
    path: s(body.path, 300),
    utm_source: s(utm.source, 120),
    utm_medium: s(utm.medium, 120),
    utm_campaign: s(utm.campaign, 160),
    referrer: s(body.referrer, 400),
    meta: body.meta && typeof body.meta === 'object' ? body.meta : null,
  };

  try {
    await supabase.from('user_events').insert(row);
  } catch {
    /* best-effort */
  }
  return NextResponse.json({ ok: true });
}

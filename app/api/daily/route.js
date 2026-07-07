import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getOrCreateDailyContent } from '../../../lib/dailyContent';

export const maxDuration = 30;

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  try {
    const content = await getOrCreateDailyContent(supabase, user);
    return NextResponse.json(content);
  } catch (err) {
    return NextResponse.json({ error: 'save_failed', details: err.message }, { status: 500 });
  }
}

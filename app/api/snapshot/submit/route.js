import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { analyzeSnapshotErrors } from '../../../../lib/correct';

export const maxDuration = 20;

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

  const text = (body.text || '').trim();
  if (!text) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const analysis = await analyzeSnapshotErrors({ text });

  const { data: created, error } = await supabase
    .from('progress_snapshots')
    .insert({ user_id: user.id, response_text: text, errors_then: analysis.erros || [] })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({ snapshot: created });
}

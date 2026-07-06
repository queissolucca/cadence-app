import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getRoleplayTurn } from '../../../../lib/roleplay';

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

  const { themeLabel, premise, transcript } = body;
  if (!themeLabel) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const result = await getRoleplayTurn({ themeLabel, premise: premise || '', transcript: transcript || [] });
  return NextResponse.json(result);
}

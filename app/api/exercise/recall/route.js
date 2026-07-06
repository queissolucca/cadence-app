import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { compareRecallGuess } from '../../../../lib/correct';

export const maxDuration = 15;

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

  const { reviewItemId, guess, porque } = body;
  if (!guess) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const result = await compareRecallGuess({ guess, porque: porque || '' });

  // Log de reflexão — nunca vira dado de erro formal, não afeta mastery.
  await supabase.from('recall_reflections').insert({
    user_id: user.id,
    review_item_id: reviewItemId || null,
    user_guess: guess,
  });

  return NextResponse.json(result);
}

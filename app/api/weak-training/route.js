import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { buildWeakTrainingQueue } from '../../../lib/weakTraining';

export const maxDuration = 20;

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const result = await buildWeakTrainingQueue(supabase, user);
  return NextResponse.json(result);
}

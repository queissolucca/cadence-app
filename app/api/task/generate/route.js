import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { generateTask } from '../../../../lib/task';
import { pickCanDoStatement } from '../../../../lib/cefr';

const SKILL_BY_MODE = { write: 'writing', speak: 'speaking' };

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

  const mode = body.mode === 'speak' ? 'speak' : 'write';
  const skill = SKILL_BY_MODE[mode];

  const { data: progress } = await supabase
    .from('skill_progress')
    .select('cefr_level')
    .eq('user_id', user.id)
    .eq('skill', skill)
    .maybeSingle();

  const cefrLevel = progress?.cefr_level || 'A1';
  const canDo = pickCanDoStatement(skill, cefrLevel);
  const task = await generateTask({ skill, cefrLevel, canDo });

  return NextResponse.json({
    scenario: {
      label: task.label,
      context: task.context,
      askPt: task.askPt,
      presentation: task.presentation,
    },
    cefrLevel,
    canDo,
  });
}

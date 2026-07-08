import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { continueRoleplay } from '../../../../../lib/roleplayV2';

// Ver comentário em app/api/v2/roleplay/start/route.js sobre por que isto
// não vive em /api/roleplay/turn (rota já ocupada pelo roleplay antigo).
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

  const { session_id, user_text } = body;
  if (!session_id || !user_text) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const { data: session } = await supabase
    .from('roleplay_sessions')
    .select('*')
    .eq('id', session_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!session || session.completed) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('correction_timing, correction_depth, pronunciation_strictness')
    .eq('id', user.id)
    .maybeSingle();
  const timingEnd = profile?.correction_timing === 'end_of_exercise' || profile?.correction_timing === 'end';

  const opening = session.messages[0] || {};
  const characterName = opening.character_name || 'Alex';
  const characterRolePt = opening.character_role_pt || 'colega de trabalho';

  const turn = await continueRoleplay({
    missionPt: session.mission_pt,
    characterName,
    characterRolePt,
    messages: session.messages,
    turnsDone: session.turns_done,
    turnsTarget: session.turns_target,
    correctionDepth: profile?.correction_depth,
    pronunciationStrictness: profile?.pronunciation_strictness,
  });

  const missionComplete = turn.mission_complete || session.turns_done + 1 >= session.turns_target;

  const newMessages = [...session.messages, { role: 'user', text: user_text }];

  // A correção/elogio é sempre persistida na hora (dados reais do erro do
  // aluno, valem pro Progresso e pra memória espaçada independente da
  // preferência de timing) — só a EXIBIÇÃO por turno é que respeita
  // correction_timing='end_of_exercise' (feita no client, que só mostra
  // mensagens role='fix' acumuladas quando mission_complete=true).
  if (turn.has_correction) {
    newMessages.push({ role: 'fix', text: turn.right_excerpt, correction: { ...turn } });

    await supabase.from('error_events').insert({
      user_id: user.id,
      category: turn.error_category,
      category_label_pt: turn.error_category_label_pt || turn.error_category,
      detail_pt: turn.explain_pt,
      wrong_text: turn.wrong_excerpt || user_text,
      right_text: turn.right_excerpt,
    });

    const pattern = (turn.error_category || turn.natural_phrase_en || '').slice(0, 80);
    await supabase.from('review_items').upsert(
      {
        user_id: user.id,
        type: 'error',
        skill: 'speaking',
        origin: 'roleplay',
        pattern,
        scenario_id: session.scenario_id,
        content: {
          categoria: turn.error_category_label_pt || turn.error_category || 'roleplay',
          exemplos_do_usuario: [user_text],
          forma_natural: turn.natural_phrase_en,
          porque: turn.explain_pt,
          dica: turn.tip_pt || (turn.natural_phrase_en && `use algo como: "${turn.natural_phrase_en}"`) || '',
        },
        stage: 0,
        next_review_at: new Date(Date.now() + 86400000).toISOString(),
      },
      { onConflict: 'user_id,skill,pattern' },
    );
  } else if (turn.has_praise) {
    newMessages.push({ role: 'fix', text: turn.praise_pt, praise: true });
  }

  newMessages.push({ role: 'ai', text: turn.ai_reply_en });

  const { data: updated } = await supabase
    .from('roleplay_sessions')
    .update({
      messages: newMessages,
      turns_done: session.turns_done + 1,
      completed: missionComplete,
    })
    .eq('id', session_id)
    .select('*')
    .single();

  const responsePayload = {
    ai_reply_en: turn.ai_reply_en,
    mission_complete: missionComplete,
    turns_done: updated.turns_done,
    turns_target: updated.turns_target,
    correction: !timingEnd && turn.has_correction ? { ...turn } : null,
    praise_pt: !timingEnd && turn.has_praise ? turn.praise_pt : null,
  };

  if (missionComplete) {
    responsePayload.accumulated_fixes = newMessages.filter((m) => m.role === 'fix');
  }

  return NextResponse.json(responsePayload);
}

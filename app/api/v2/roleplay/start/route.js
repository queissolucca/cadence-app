import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { startRoleplay } from '../../../../../lib/roleplayV2';

// Rota nova, em /api/v2/roleplay/* — não usa /api/roleplay/* porque esse
// caminho já existe (lib/roleplay.js), servindo o roleplay antigo dentro de
// CadenceApp.js, com um contrato incompatível. Evita colidir/sobrescrever.
export const maxDuration = 20;

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_scenario_id, session_duration')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.active_scenario_id) {
    return NextResponse.json({ error: 'no_active_scenario' }, { status: 400 });
  }

  const { data: scenario } = await supabase
    .from('scenarios')
    .select('id, title, subtitle')
    .eq('id', profile.active_scenario_id)
    .maybeSingle();

  const turnsTarget = profile.session_duration >= 12 ? 7 : profile.session_duration <= 5 ? 4 : 5;

  const start = await startRoleplay({ scenarioTitle: scenario?.title || 'trabalho remoto', scenarioSubtitle: scenario?.subtitle });

  const { data: session, error } = await supabase
    .from('roleplay_sessions')
    .insert({
      user_id: user.id,
      scenario_id: profile.active_scenario_id,
      mission_pt: start.mission_pt,
      // guarda o personagem dentro da própria primeira mensagem — evita
      // migration nova só pra 2 campos que nunca mudam durante a sessão.
      messages: [{ role: 'ai', text: start.opening_en, character_name: start.character_name, character_role_pt: start.character_role_pt }],
      turns_target: turnsTarget,
      turns_done: 0,
    })
    .select('*')
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'session_create_failed' }, { status: 500 });
  }

  return NextResponse.json({
    session_id: session.id,
    mission_pt: session.mission_pt,
    character: { name: start.character_name, role_pt: start.character_role_pt },
    opening_en: start.opening_en,
    turns_target: session.turns_target,
    turns_done: session.turns_done,
    scenario_title: scenario?.title || '',
  });
}

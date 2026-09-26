import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { ESTILOS_CADY } from '../../../../lib/cady/tom';

// Um único endpoint pra toda preferência de profiles — a aba Ajustes (v2)
// reusa este em vez de criar uma rota por campo.
const FIELDS = {
  correctionTiming: { column: 'correction_timing', valid: ['inline', 'end_of_exercise'] },
  correctionDepth: { column: 'correction_depth', valid: ['explain_always', 'flag_only'] },
  weeklyCadence: { column: 'weekly_cadence_target', valid: [3, 4, 5, 6, 7] },
  sessionDuration: { column: 'session_duration', valid: [5, 8, 12] },
  voiceAccent: { column: 'voice_accent', valid: ['us', 'uk'] },
  audioSpeed: { column: 'audio_speed', valid: [0.75, 1.0] },
  pronunciationStrictness: { column: 'pronunciation_strictness', valid: ['low', 'medium', 'high'] },
  theme: { column: 'theme', valid: ['light', 'dark', 'auto'] },
  reminderEnabled: { column: 'reminder_enabled', valid: [true, false] },
  reminderTime: { column: 'reminder_time', valid: null }, // validado por regex abaixo
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

  const update = {};
  for (const [key, def] of Object.entries(FIELDS)) {
    if (body[key] === undefined) continue;
    if (key === 'reminderTime') {
      if (!TIME_RE.test(body[key])) {
        return NextResponse.json({ error: 'invalid_reminder_time' }, { status: 400 });
      }
    } else if (!def.valid.includes(body[key])) {
      return NextResponse.json({ error: `invalid_${key}` }, { status: 400 });
    }
    update[def.column] = body[key];
  }

  /* O ESTILO DA CADY VAI NUM UPDATE SÓ DELE, e de propósito fora de FIELDS.

     A coluna `cady_estilo` nasce na migration 0040, rodada à mão. Enquanto ela
     não roda, um update que a inclua é recusado INTEIRO pelo Postgres — e se
     ela estivesse em FIELDS, qualquer corpo que a trouxesse junto de `theme`
     derrubaria a troca de tema também. Separado, o pior caso é só o estilo
     não salvar (e a aba Perfil nem mostra a linha enquanto a coluna não
     existe: ver lerEstiloCady em lib/cady/tomServidor.js). */
  let cadyEstilo;
  if (body.cadyEstilo !== undefined) {
    if (!ESTILOS_CADY.includes(body.cadyEstilo)) {
      return NextResponse.json({ error: 'invalid_cadyEstilo' }, { status: 400 });
    }
    cadyEstilo = body.cadyEstilo;
  }

  if (Object.keys(update).length === 0 && cadyEstilo === undefined) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
    if (error) {
      return NextResponse.json({ error: 'update_failed', details: error.message }, { status: 500 });
    }
  }

  if (cadyEstilo !== undefined) {
    const { error } = await supabase.from('profiles').update({ cady_estilo: cadyEstilo }).eq('id', user.id);
    if (error) {
      return NextResponse.json({ error: 'update_failed', details: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { extrairCorrecoes } from '../../../../lib/correcoes';

export const dynamic = 'force-dynamic';

/* POST { messages } → lê a conversa e salva na Revisão o que vale revisar.
   Uma chamada Haiku, best-effort, DEPOIS da conversa — ver lib/correcoes.js pra
   por que isto saiu de dentro do turno. */
export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length < 4) return NextResponse.json({ ok: true, added: 0 });

  try {
    const r = await extrairCorrecoes(supabase, user, messages);
    return NextResponse.json({ ok: true, ...r });
  } catch {
    return NextResponse.json({ ok: true, added: 0 });
  }
}

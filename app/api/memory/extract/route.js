import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { extractMemories } from '../../../../lib/memory';

export const dynamic = 'force-dynamic';

// POST { messages } → extrai fatos pessoais da conversa e salva (1 chamada Haiku,
// best-effort). Chamado no fim de uma conversa ABERTA (não em lição/revisão).
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
    const result = await extractMemories(supabase, user, messages);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: true, added: 0 });
  }
}

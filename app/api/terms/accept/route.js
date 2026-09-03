import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { TERMS_VERSION } from '../../../../lib/terms';

export const dynamic = 'force-dynamic';

// POST → grava o aceite dos Termos e Condições do usuário logado na versão
// vigente. Idempotente: re-aceitar a mesma versão não duplica (ignoreDuplicates
// via ON CONFLICT). A versão é sempre a do servidor (TERMS_VERSION), nunca a
// enviada pelo cliente, pra o registro refletir o texto realmente publicado.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const row = {
    user_id: user.id,
    version: TERMS_VERSION,
    email: user.email || null,
    accepted_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('terms_acceptance')
    .upsert(row, { onConflict: 'user_id,version', ignoreDuplicates: true });

  if (error) return NextResponse.json({ error: 'save_failed', details: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, version: TERMS_VERSION });
}

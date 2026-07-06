import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { evaluateRoleplay } from '../../../../lib/roleplay';

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

  const { themeLabel, transcript } = body;
  if (!themeLabel || !Array.isArray(transcript)) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const result = await evaluateRoleplay({ themeLabel, transcript });

  const createdItems = [];
  for (const item of result.erros || []) {
    // §6: erros do roleplay alimentam review_items normalmente, só que com
    // origin="roleplay" — útil pra diferenciar depois erros sob "pressão
    // conversacional" dos de exercício isolado.
    const { data: created } = await supabase
      .from('review_items')
      .upsert(
        {
          user_id: user.id,
          type: 'error',
          skill: 'speaking',
          origin: 'roleplay',
          pattern: item.pattern,
          content: {
            categoria: item.categoria,
            exemplos_do_usuario: [item.exemplo_usuario],
            forma_natural: item.forma_natural,
            porque: item.porque,
            dica: item.dica,
          },
          stage: 0,
          next_review_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,skill,pattern' },
      )
      .select('*')
      .single();
    if (created) createdItems.push(created);
  }

  return NextResponse.json({ resumo: result.resumo, createdItems });
}

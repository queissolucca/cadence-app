import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { runDiagnostic } from '../../../../lib/diagnostic';
import { clampAxis } from '../../../../lib/patents';

// Avaliação batch das 5 tarefas no Sonnet pode passar do limite padrão de
// função serverless — dá folga (Vercel Hobby permite até 60s).
export const maxDuration = 30;

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

  const result = await runDiagnostic(body.answers || {});

  await Promise.all(
    ['writing', 'speaking'].map((skill) => {
      const axes = result[skill];
      return supabase.from('skill_progress').upsert(
        {
          user_id: user.id,
          skill,
          precisao: clampAxis(axes.precisao),
          naturalidade: clampAxis(axes.naturalidade),
          vocabulario: clampAxis(axes.vocabulario),
          fluencia: clampAxis(axes.fluencia),
        },
        { onConflict: 'user_id,skill' },
      );
    }),
  );

  const createdItems = [];
  for (const item of result.itens_ledger || []) {
    const { data: created } = await supabase
      .from('review_items')
      .upsert(
        {
          user_id: user.id,
          type: 'error',
          skill: item.skill === 'speaking' ? 'speaking' : 'writing',
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

  return NextResponse.json({
    writing: result.writing,
    speaking: result.speaking,
    ledgerItems: createdItems,
  });
}

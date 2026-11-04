import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { validadeAtual } from '../../../lib/acessoPago';
import { recorrenciasAtivas, cancelarRecorrencias } from '../../../lib/assinaturaAsaas';

export const dynamic = 'force-dynamic';

/* A assinatura da pessoa logada: GET mostra, DELETE cancela.

   Exige LOGIN, não pagamento (está em GRATIS_EXATAS de lib/apiAccess.js): quem
   tem o acesso vencido e uma cobrança ainda ativa no cartão precisa conseguir
   cancelar — trancar o cancelamento atrás do pagamento seria cobrar pra deixar
   de ser cobrado. */

async function quem() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

const publico = (it) => ({ tipo: it.tipo, valor: it.valor, proximaCobranca: it.proximaCobranca });

export async function GET() {
  const { supabase, user } = await quem();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  if (!process.env.ASAAS_API_KEY) return NextResponse.json({ assinaturas: [], acessoAte: null, configurado: false });

  const [itens, acessoAte] = await Promise.all([
    recorrenciasAtivas(createAdminClient(), user),
    validadeAtual(supabase, user.email),
  ]);
  return NextResponse.json({ assinaturas: itens.map(publico), acessoAte, configurado: true });
}

export async function DELETE() {
  const { supabase, user } = await quem();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  if (!process.env.ASAAS_API_KEY) return NextResponse.json({ error: 'not_configured' }, { status: 500 });

  const admin = createAdminClient();
  const itens = await recorrenciasAtivas(admin, user);
  if (!itens.length) return NextResponse.json({ canceladas: 0, nada: true });

  const { canceladas, falhas } = await cancelarRecorrencias(itens);
  if (falhas.length) console.error('[assinatura] falha ao cancelar:', user.id, falhas);

  // O webhook marca o pedido como cancelado também; isto só adianta a tela.
  try {
    await admin.from('orders').update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('provider', 'asaas').eq('status', 'paid');
  } catch { /* best-effort */ }

  const acessoAte = await validadeAtual(supabase, user.email);
  return NextResponse.json(
    { canceladas, falhou: falhas.length > 0, acessoAte },
    { status: falhas.length && !canceladas ? 502 : 200 },
  );
}

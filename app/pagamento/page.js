import { createClient } from '../../lib/supabase/server';
import { PagamentoTela } from './PagamentoTela';

export const dynamic = 'force-dynamic';

/* Só quem tem sessão chega aqui: o middleware manda anônimo pro /login, e quem
   já tem acesso válido pro /v2. Esta página é o passo de cobrança do funil.

   O que ela NÃO faz: liberar acesso. Acesso é uma linha em paid_emails escrita
   pela service_role a partir do webhook do AbacatePay — a tabela tem RLS com
   uma única policy, SELECT da própria linha, e nenhuma de escrita. Nem esta
   página nem o cliente conseguem se conceder acesso. */

// "10 minutos / dia" -> 10. É o que a pessoa escolheu no onboarding; serve só
// pra a lista do card falar o número dela em vez de um genérico.
function minutosDe(dailyGoal) {
  const n = parseInt(String(dailyGoal || '').match(/\d+/)?.[0] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export default async function PagamentoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Expirado x nunca-pago mudam a copy, e só isso — os dois caem na mesma
  // cobrança. A consulta é a linha do próprio usuário (o que a RLS permite).
  let expirado = false;
  let minutos = 5;
  if (user) {
    const [pago, onboarding] = await Promise.all([
      supabase.from('paid_emails').select('expires_at').eq('email', user.email).maybeSingle(),
      supabase.from('onboarding').select('daily_goal').eq('user_id', user.id).maybeSingle(),
    ]);
    const linha = pago.data;
    expirado = !!linha?.expires_at && new Date(linha.expires_at) <= new Date();
    minutos = minutosDe(onboarding.data?.daily_goal);
  }

  return <PagamentoTela email={user?.email || ''} minutos={minutos} expirado={expirado} />;
}

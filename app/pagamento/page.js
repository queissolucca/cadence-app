import { createClient } from '../../lib/supabase/server';
import { validadeAtual } from '../../lib/acessoPago';
import { identidade } from '../../lib/sessaoServidor';
import { PagamentoTela } from './PagamentoTela';
import { EnviaRespostas } from './EnviaRespostas';

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

  /* ESTA TELA É PÚBLICA, E NENHUM SOLUÇO PODE ESCONDER O PREÇO.

     Ela virou a vitrine: quem chega sem conta vê o valor e decide. Por isso a
     identidade é um DETALHE aqui — serve pra personalizar (o e-mail preenchido,
     os minutos que a pessoa escolheu, a copy de "expirado") e não pra decidir se
     a página existe.

     Vem do cabeçalho que o middleware já deixou, sem ida à rede, e dentro de um
     try: o `getUser()` que estava aqui é uma requisição ao servidor de auth a
     cada visita, e um erro dela derrubava a página inteira — justamente a página
     onde o dinheiro entra. Falhar pra "anônimo" custa um e-mail não preenchido;
     falhar pra erro custa a venda. */
  let eu = null;
  try {
    eu = await identidade();
  } catch {
    /* segue como visitante */
  }
  const user = eu?.id ? eu : null;

  // Expirado x nunca-pago mudam a copy, e só isso — os dois caem na mesma
  // cobrança. A consulta é a linha do próprio usuário (o que a RLS permite).
  let expirado = false;
  let minutos = 5;
  // Quem confirma o e-mail cai aqui direto, e nesse instante as respostas das 33
  // telas ainda estão só no navegador dele. `onboarded_at` é como se sabe se
  // elas já chegaram ao banco.
  let jaEnviou = true;
  if (user) {
    /* Mesma regra: isto personaliza, não decide. Uma consulta que falha vira o
       padrão, e não uma tela de erro. */
    try {
      /* `validadeAtual` em vez da consulta à mão: paid_emails guarda uma linha
         por COMPRA agora, e o `.maybeSingle()` que estava aqui erraria com
         mais de uma. A regra de qual linha vale mora em lib/acessoPago.js. */
      const [validade, onboarding, perfil] = await Promise.all([
        validadeAtual(supabase, user.email),
        supabase.from('onboarding').select('daily_goal').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('onboarded_at').eq('id', user.id).maybeSingle(),
      ]);
      expirado = !!validade && new Date(validade) <= new Date();
      minutos = minutosDe(onboarding.data?.daily_goal);
      jaEnviou = !!perfil.data?.onboarded_at;
    } catch {
      /* fica no padrão: o preço aparece de qualquer jeito */
    }
  }

  return (
    <>
      <EnviaRespostas jaEnviou={jaEnviou} />
      <PagamentoTela email={user?.email || ''} minutos={minutos} expirado={expirado} />
    </>
  );
}

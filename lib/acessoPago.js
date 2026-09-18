/* QUEM TEM ACESSO PAGO, EM UM LUGAR SÓ.

   Esta pergunta é feita em quatro pontos distantes: o middleware (que barra as
   rotas de API), o shell do /v2 (que põe o cadeado na Trilha), o polling do
   /obrigado e a tela /pagamento. Os quatro tinham a mesma consulta copiada, e
   copiada é como elas divergem — uma ganha um `order by` que a outra não ganha,
   e o produto passa a responder duas coisas diferentes pra mesma pessoa.

   A cópia ficou insustentável quando `paid_emails` passou a ter VÁRIAS linhas
   por e-mail: as quatro usavam `.maybeSingle()`, que ERRA com mais de uma
   linha. Quem pagasse duas vezes quebraria os quatro ao mesmo tempo.

   DUAS REGRAS, e as duas importam:

   1. Linha sem `expires_at` = acesso sem prazo. São as contas liberadas à mão
      antes de existirem planos com validade. Basta UMA linha assim.
   2. Com prazo, vale a data que vai MAIS LONGE. Não a mais recente: quem
      comprou 3 meses e depois 7 dias não pode ter o acesso encurtado pela
      compra menor. */

/** Devolve true (tem acesso), false (não tem) ou undefined (não deu pra saber). */
export async function acessoPagoDe(supabase, email) {
  if (!email) return false;

  const r = await supabase
    .from('paid_emails')
    .select('expires_at')
    .eq('email', email)
    .order('expires_at', { ascending: false, nullsFirst: true })
    .limit(50);

  /* `undefined` e não `false`: "a consulta falhou" é diferente de "não pagou".
     Quem chama decide o que fazer com a dúvida — nas páginas a pessoa fica
     onde está, nas rotas de API a dúvida NEGA, porque cada chamada liberada
     por engano queima minuto de ElevenLabs ou token da Anthropic. */
  if (r.error) return undefined;

  const linhas = r.data || [];
  if (!linhas.length) return false;

  // `nullsFirst` põe as sem prazo na frente: se a primeira for nula, é
  // vitalícia e nem precisa comparar data.
  if (!linhas[0].expires_at) return true;

  return new Date(linhas[0].expires_at) > new Date();
}

/* A data até onde o acesso vale, ou null. Serve pra tela de pagamento dizer
   "seu acesso venceu em tal dia" em vez de só barrar. */
export async function validadeAtual(supabase, email) {
  if (!email) return null;
  const r = await supabase
    .from('paid_emails').select('expires_at').eq('email', email)
    .order('expires_at', { ascending: false, nullsFirst: true }).limit(50);
  if (r.error || !r.data?.length) return null;
  return r.data[0].expires_at || null;   // null = sem prazo
}

/* De onde a PRÓXIMA compra começa a contar.

   Se a pessoa ainda tem acesso, o novo prazo soma ao que sobrou em vez de
   começar de hoje — comprar uma semana faltando cinco dias não pode fazer ela
   PERDER esses cinco. Sem acesso vigente, conta de agora. */
export function baseDaRenovacao(validade, agora = new Date()) {
  if (!validade) return agora;
  const fim = new Date(validade);
  return fim > agora ? fim : agora;
}

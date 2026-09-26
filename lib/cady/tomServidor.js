import { normalizarEstilo, sanitizarSinaisTom, estaTravando, resolverTom } from './tom';

/* AS LEITURAS DO SERVIDOR QUE ALIMENTAM O TOM (a regra em si mora em tom.js).

   Recebem o client do Supabase por parâmetro, e não o criam, pelo mesmo motivo
   de tom.js ser puro: dá pra testar com um client de mentira (ver
   tests/tomCady.test.js), sem Next e sem banco.

   A REGRA DO DONO AQUI É "SEM QUEBRAR NADA". A coluna `profiles.cady_estilo`
   nasce na migration 0040, que é rodada à mão no painel do Supabase — então
   por um tempo o código vai estar no ar SEM ela. Por isso:

   - o estilo é lido numa consulta SÓ DELE. Posto no mesmo select de
     `full_name`, uma coluna que não existe faria o Postgres recusar o select
     inteiro, e a Cady perderia o nome da pessoa junto;
   - nenhuma destas funções lança. Erro vira null, e null é "não sei" — que a
     regra de tom.js trata como o lado gentil. */

/** O estilo escolhido no Perfil; null se não deu pra ler (ex.: migration 0040 pendente). */
export async function lerEstiloCady(supabase, userId) {
  if (!userId) return null;
  try {
    const r = await supabase.from('profiles').select('cady_estilo').eq('id', userId).maybeSingle();
    if (r?.error) return null;
    return normalizarEstilo(r?.data?.cady_estilo);
  } catch {
    return null;
  }
}

/* QUANTAS OUTRAS CONVERSAS ESTA PESSOA JÁ TEVE.

   "As 3 primeiras conversas" contadas em `conversations`, que guarda tanto as
   do Escrever quanto as do Falar (e as lições por escrito). Conta todas: o que
   se quer medir é o quanto a pessoa já conhece a Cady, e quem fez três
   conversas por voz não é mais recém-chegado no texto.

   A CONVERSA ATUAL FICA DE FORA. O TextChatClient grava a conversa depois da
   PRIMEIRA resposta, então a partir da segunda mensagem ela já é uma linha da
   tabela — e numa retomada ela já era desde o começo. Contada, a 3ª conversa
   viraria "3 anteriores" no meio dela mesma e perderia a suavidade. O cliente
   manda o id que já tem (`conversaId`) e ele sai da contagem com `neq`.
   Sobra uma janela pequena: a segunda mensagem enviada antes de o POST da
   primeira voltar com o id. Ela só faz diferença na fronteira da 3ª conversa,
   e dura o tempo de uma ida ao banco.

   `head: true` + `count: 'exact'` não traz linha nenhuma, só o número, e o
   índice (user_id, started_at) da 0012 cobre o filtro. */
export async function contarOutrasConversas(supabase, userId, conversaId = null) {
  if (!userId) return null;
  try {
    let q = supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (conversaId) q = q.neq('id', conversaId);
    const r = await q;
    if (r?.error || typeof r?.count !== 'number') return null;
    return r.count;
  } catch {
    return null;
  }
}

/* O nível de tom deste turno da conversa aberta: 'iniciante' | 'suave' | 'acida'.

   As duas leituras saem juntas, e o /api/chat chama isto dentro do mesmo
   Promise.all da memória e das correções antigas: nada aqui soma latência à
   resposta. `mensagens` é o histórico já normalizado pela rota; `sinaisBrutos`
   é o `tom` do body, do jeito que o navegador mandou. */
export async function carregarTom(supabase, userId, mensagens, sinaisBrutos) {
  const sinais = sanitizarSinaisTom(sinaisBrutos);
  const [estilo, conversasAnteriores] = await Promise.all([
    lerEstiloCady(supabase, userId),
    contarOutrasConversas(supabase, userId, sinais.conversaId),
  ]);
  return resolverTom({
    estilo,
    travando: estaTravando(mensagens, sinais.correcoesSeguidas),
    conversasAnteriores,
    acertos: sinais.acertos,
  });
}

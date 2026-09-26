import { ESTILO_PADRAO, normalizarEstilo, sanitizarSinaisTom, estaTravando, resolverTom } from './tom';

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

/* A resposta do Postgres pra coluna que não existe (undefined_column). É o
   único erro que diz alguma coisa sobre a PESSOA: sem a coluna, ninguém
   escolheu estilo nenhum ainda. Qualquer outro erro (timeout, rede, 500) não
   diz nada. */
const COLUNA_INEXISTENTE = '42703';

async function consultarEstilo(supabase, userId) {
  if (!userId) return { estilo: null, semColuna: false };
  try {
    const r = await supabase.from('profiles').select('cady_estilo').eq('id', userId).maybeSingle();
    if (r?.error) return { estilo: null, semColuna: r.error.code === COLUNA_INEXISTENTE };
    return { estilo: normalizarEstilo(r?.data?.cady_estilo), semColuna: false };
  } catch {
    return { estilo: null, semColuna: false };
  }
}

/** O estilo escolhido no Perfil; null se não deu pra ler (ex.: migration 0040 pendente).
    É o que o Perfil usa pra decidir se mostra a linha "Estilo da Cady" — por
    isso a coluna inexistente continua sendo null aqui. */
export async function lerEstiloCady(supabase, userId) {
  return (await consultarEstilo(supabase, userId)).estilo;
}

/* QUANTAS OUTRAS CONVERSAS ESTA PESSOA JÁ TEVE.

   "As 3 primeiras conversas" contadas em `conversations`, que guarda tanto as
   do Escrever quanto as do Falar. As duas contam: o que se quer medir é o
   quanto a pessoa já conhece a Cady, e quem fez três conversas por voz não é
   mais recém-chegado no texto.

   DUAS COISAS DA TABELA NÃO SÃO CONVERSA, e ficam de fora:

   - LIÇÃO DA TRILHA. O mesmo TextChatClient (e o agente de voz) grava a
     lição como linha de `conversations`, com o título "Lição: …". Lá a Cady
     é outra — o prompt da lição é o de uma professora calorosa —, então três
     lições curtas não apresentaram ninguém à Cady da conversa aberta. Contadas,
     o usuário novo abria a Conversa aberta pela PRIMEIRA vez já fora da janela
     suave.
   - CONVERSA QUE NÃO ACONTECEU. A linha nasce na primeira resposta da Cady:
     um "oi" e a pessoa foi embora já é uma linha (saudação + oi + resposta =
     3 falas). `turn_count` guarda quantas falas ela tem; a partir de 4, houve
     pelo menos uma troca de verdade depois da primeira.

   Os dois filtros só estreitam a contagem, e contagem menor é o lado gentil:
   a pessoa fica mais tempo na janela suave, nunca menos. O título vem sempre
   preenchido (a POST de /api/conversations grava 'Conversa' quando não vem
   nenhum), então o `not like` não perde conversa de título vazio.

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
const FALAS_DE_UMA_CONVERSA = 4;

export async function contarOutrasConversas(supabase, userId, conversaId = null) {
  if (!userId) return null;
  try {
    let q = supabase.from('conversations').select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('title', 'like', 'Lição:%')
      .gte('turn_count', FALAS_DE_UMA_CONVERSA);
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
  const [{ estilo, semColuna }, conversasAnteriores] = await Promise.all([
    consultarEstilo(supabase, userId),
    contarOutrasConversas(supabase, userId, sinais.conversaId),
  ]);
  /* Migration 0040 pendente: todo mundo é Equilibrada, que é o default que a
     migration vai gravar — o código funciona igual antes e depois dela. Já um
     erro qualquer na leitura fica null, e resolverTom não deixa null virar
     ácida (pode ser alguém que escolheu Iniciante). */
  return resolverTom({
    estilo: semColuna ? ESTILO_PADRAO : estilo,
    travando: estaTravando(mensagens, sinais.correcoesSeguidas),
    conversasAnteriores,
    acertos: sinais.acertos,
  });
}

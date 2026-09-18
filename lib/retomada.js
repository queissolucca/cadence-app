/* O texto que a Cady recebe pra CONTINUAR uma conversa em vez de recomeçá-la.

   Serve ao botão "continuar falando" e à reabertura automática depois de uma
   QUEDA DE REDE — nos dois casos o app precisa devolver o que já tinha sido
   dito, senão a Cady volta se apresentando e a pessoa percebe a costura.

   Fim decidido pelo agente (teto de duração, End Call, silêncio) não reabre
   mais nada: ver `deveRetomar` embaixo.

   Duas cópias do mesmo texto divergiriam no primeiro ajuste de prompt, e a
   divergência apareceria só como "às vezes ela lembra, às vezes não". */

/* Quantos caracteres da conversa cabem. Não é a conversa inteira de propósito:
   este texto entra no prompt do agente a cada sessão, e prompt é token — uma
   conversa de uma hora reenviada inteira a cada retomada custa dinheiro e come
   a janela de contexto do modelo, que é uma das coisas que faz um agente parar
   de responder. O trecho recente é o que importa pra continuar.

   Era 4.500 (~1.250 tokens). Em 3.000 fica ~830, e o que se perde é profundidade
   de memória DENTRO de uma retomada: ela lembra dos últimos minutos em vez dos
   últimos vários. Numa conversa retomada isso quase nunca aparece; numa retomada
   de retomada, pode aparecer. */
export const ORCAMENTO = 3000;

export function contextoDeRetomada(mensagens, topico) {
  const todas = Array.isArray(mensagens) ? mensagens : [];
  if (!todas.length) return '';
  const linhas = todas
    .map((m) => `${m.role === 'you' ? 'Student' : 'Coach'}: ${m.text}`)
    .join('\n');
  const sobre = topico ? ` about "${topico}"` : '';
  const cabeca = `You and the student were already having this conversation${sobre}. Here's the transcript so far:\n\n`;
  const cauda = '\n\nContinue naturally from exactly where it left off — you remember all of this, so don\'t restart and don\'t make them repeat themselves.';
  const corpo = linhas.length > ORCAMENTO ? `…${linhas.slice(-ORCAMENTO)}` : linhas;
  return cabeca + corpo + cauda;
}

/* Quantas vezes o app reabre a conversa sozinho antes de desistir, e o mínimo de
   conversa que justifica reabrir. Os dois existem por dinheiro: cada sessão
   reaberta é minuto pago no ElevenLabs, e um agente mal configurado que derruba
   na hora vira um laço que reabre pra sempre. */
export const MAX_RETOMADAS = 3;
export const MINIMO_MS = 15000;

/* A conversa acabou. Vale reabrir sozinho?

   `motivo`     = o `reason` do onDisconnect ('user' | 'agent' | 'error' | …).
   `pedido`     = foi a pessoa que encerrou (o botão, ou reason 'user').
   `aberta`     = é conversa aberta (não é lição, revisão nem drill de card).
   `falas`      = quantas falas já existem na conversa.
   `duracaoMs`  = quanto durou o trecho que acabou de cair.
   `jaRetomou`  = quantas retomadas automáticas já houve nesta conversa.

   NINGUÉM REABRE MAIS. A função existe, é chamada, e responde `false` sempre.
   Vale dizer por que, porque a versão anterior deste comentário estava errada.

   PRIMEIRA TENTATIVA, QUE FALHOU: tirei só `motivo === 'agent'`, apostando que
   o SDK classificaria o teto de duração como fim do agente. Deployado, testado
   em produção, e a Cady voltou com o mesmo "Sorry, I cut out for a second".
   Ou seja: o fim por teto NÃO chega aqui como 'agent' — chega como 'error',
   indistinguível de queda de rede pelo campo `reason`.

   Havia como continuar refinando (o `closeCode`: 1006 é queda anormal, 1000 é
   fechamento limpo do servidor). Mas isso é a MESMA aposta que acabou de
   falhar, feita uma segunda vez, num comportamento que o usuário já reportou
   duas vezes. Enquanto não houver uma amostra real de telemetria dizendo qual
   código chega, adivinhar de novo é pior do que parar.

   O QUE SE PERDE: recuperação automática de queda de rede. Se a internet
   piscar no meio da conversa, a pessoa toca de novo em vez de o app religar
   sozinho. É um custo real e pequeno; o benefício é que o limite configurado
   no painel passa a valer SEMPRE, que é o que foi pedido.

   Para reativar só a recuperação de rede, quando houver dado: devolver o
   `motivo !== 'error'` abaixo, mais um `closeCode === 1006`.

   POR QUE A REABERTURA EXISTIU: o teto de duração do ElevenLabs cortava a
   conversa aberta no meio de uma frase, e reabrir sozinho era a forma de durar
   mais do que a plataforma deixava. Só que o teto deixou de ser um acidente
   para virar uma DECISÃO — 300s configurados de propósito no painel, mais o
   End Conversation after silence. Reabrir virou o app desobedecendo à
   configuração: a Cady se despedia ("that's our time for now") e dois segundos
   depois voltava com "Sorry, I cut out for a second — I'm back!", que é uma
   despedida desmentida por quem acabou de dá-la.

   Fim é fim. Para voltar a falar, a pessoa toca na Cady de novo — e aí é outra
   conversa, sobre o que ela quiser.

   Os parâmetros continuam na assinatura de propósito: eles documentam o que já
   foi considerado relevante aqui, e são o ponto de partida de qualquer versão
   futura mais fina. */
export function deveRetomar() {
  return false;
}

/* O texto que a Cady recebe pra CONTINUAR uma conversa em vez de recomeçá-la.

   Isto já existia dentro da tela da aba Conversar, servindo só ao botão
   "continuar falando". Agora tem um segundo usuário, e mais importante que o
   primeiro: quando o agente do ElevenLabs encerra a conversa sozinho (teto de
   duração, End Call, erro do lado de lá), o app reabre a sessão e precisa
   entregar de volta o que já tinha sido dito — senão a Cady volta se
   apresentando, e a pessoa percebe a costura.

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

   O caso que justifica tudo isto é `motivo === 'agent'`: quem desligou foi o
   agente do ElevenLabs — teto de duração da conversa, End Call, contexto cheio —
   e nada disso é uma decisão de quem está falando. 'error' entra junto porque do
   lado de cá é indistinguível de queda de rede, e o remédio é o mesmo.

   O que NÃO entra:
   - lição e revisão: ali o agente encerrar é o comportamento correto (o system
     prompt manda fechar depois do drill), e reabrir brigaria com o produto;
   - conversa que caiu logo no começo: é sinal de configuração errada, não de
     teto atingido, e insistir só queima minuto;
   - conversa sem fala nenhuma: não há o que continuar. */
export function deveRetomar({ motivo, pedido, aberta, falas, duracaoMs, jaRetomou }) {
  if (pedido || motivo === 'user') return false;
  if (!aberta) return false;
  if (motivo !== 'agent' && motivo !== 'error') return false;
  if (!(falas >= 2)) return false;
  if (!(duracaoMs >= MINIMO_MS)) return false;
  return jaRetomou < MAX_RETOMADAS;
}

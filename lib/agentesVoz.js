/* De qual agente do ElevenLabs é cada voz. SÓ SERVIDOR.

   A tradução chave → id mora aqui, e não no cliente, por um motivo de dinheiro:
   se a rota do signed URL aceitasse um `agent_id` vindo do navegador, qualquer
   pessoa logada abriria QUALQUER agente da conta do ElevenLabs — inclusive os
   caros, inclusive os que não são deste produto — queimando minuto com um
   parâmetro de query. O cliente manda uma chave curta ('cadi', 'tranquila'); o
   que não estiver nesta lista não existe.

   Os ids de agente não são segredo (sozinhos não abrem nada — quem abre é a
   API key, que nunca sai do servidor), então o literal aqui é seguro. Ele é o
   FALLBACK: a variável de ambiente ganha, pra dar pra trocar de agente sem
   deploy. A da Cady não tem literal de propósito — ela já vive em
   ELEVENLABS_AGENT_ID desde o começo, e duplicar o valor em dois lugares é
   pedir pra eles divergirem. */

export const VOZES = {
  cadi: () => process.env.ELEVENLABS_AGENT_ID,
  tranquila: () => process.env.ELEVENLABS_AGENT_ID_TRANQUILA
    || 'agent_4301m2725r6aey2swh592r0ked0j',
};

// Qual voz usar quando o cliente não pede nenhuma (ou pede uma que não existe).
export const VOZ_PADRAO = 'cadi';

/* Devolve o id do agente, ou null quando a chave é desconhecida ou o ambiente
   não está configurado. Quem chama responde 503 nesse caso — é o mesmo sinal
   de "ElevenLabs não configurado" que a tela já sabe mostrar. */
export function idDoAgente(chave) {
  const buscar = VOZES[chave] || VOZES[VOZ_PADRAO];
  const id = buscar && buscar();
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

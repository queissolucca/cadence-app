/* OS PASSOS NUMERADOS DO ONBOARDING — a lista, e só ela.

   O número que aparece na tela ("PASSO 7") era escrito à mão em cada uma das
   nove telas que o mostram. Isso torna a numeração uma coisa que se desalinha em
   SILÊNCIO: tirar uma tela do meio do fluxo não quebra build nem teste, só faz a
   pessoa ver "passo 2, passo 4, passo 5" e sentir que o produto está mal feito
   sem saber dizer por quê. Foi exatamente o que quase aconteceu ao remover a
   pergunta de áudio.

   Agora o número sai daqui. Tirar uma tela desta lista renumera todas as outras,
   e a tela que antes era a 7 passa a ser a 6 sozinha.

   POR QUE UMA LISTA PRÓPRIA, e não uma marca dentro do SCREENS: nem toda tela do
   fluxo é um passo que a pessoa conta. O splash, as telas de espera, o resultado
   da lição, o plano — tudo isso é fluxo sem ser pergunta. E esta lista precisa
   ser importável pelo shell (que desenha o rótulo) sem criar ciclo com o flow.js
   (que importa as telas, que importam o shell).

   `idioma` é o passo 1 mesmo sem imprimir o número: a tela dele é `bare`, sem a
   trilha no topo. Ele conta porque é a primeira escolha de verdade — e é por ele
   que a numeração das seguintes começa em 2. */

export const PASSOS = [
  'idioma',
  'nivel',
  'objetivo',
  'bloqueio',
  'hoje',
  'prazo',
  'horario',
  'minutos',
  'temas',
];

export const TOTAL_DE_PASSOS = PASSOS.length;

/* O número que a tela mostra, 1-based. Devolve null pra tela que não é passo —
   quem chama não desenha rótulo nenhum nesse caso, em vez de escrever "Passo
   null" ou "Passo 0". */
export function numeroDoPasso(id) {
  const i = PASSOS.indexOf(id);
  return i < 0 ? null : i + 1;
}

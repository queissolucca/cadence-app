/* O QUE É GRÁTIS E O QUE É PAGO.

   Um lugar só, porque esta decisão precisa valer igual em três pontos que não
   se enxergam: o middleware (que nega de verdade), a barra de abas (que põe o
   cadeado) e o popup de pagamento (que explica). Espalhada, ela vira três
   respostas diferentes pra mesma pergunta.

   O MODELO: escrever com a Cady é livre pra quem tem conta. FALAR e a TRILHA
   são pagos. Quem não pagou vê a tela, toca, e recebe o popup — em vez de um
   redirecionamento que não explica nada.

   Por que a lista aqui é de PAGOS e não de grátis: o portão de API continua
   sendo default-deny (ver lib/apiAccess.js). Aqui a lista só diz QUAL recurso
   pago a pessoa tentou usar, pra o popup falar a língua dela. Errar nesta
   lista deixa o popup genérico; não abre porta nenhuma. */

export const FALA = 'fala';
export const TRILHA = 'trilha';

/* As rotas de PÁGINA que exigem pagamento. O middleware NÃO redireciona
   ninguém por causa delas — quem barra de verdade é a API. Elas existem pra
   tela saber que precisa abrir o popup assim que carregar. */
const PAGINAS_PAGAS = [
  /* `/v2/conversar` NÃO está aqui de propósito: ela abre no modo ESCREVER, que
     é grátis. O que é pago ali é o botão "Falar" dentro dela — quem barra é o
     próprio botão, não a rota. Pôr a página nesta lista faria o popup abrir em
     cima de um recurso que a pessoa tem direito de usar. */
  { prefixo: '/v2/trilha', recurso: TRILHA },
];

export function recursoPagoDaPagina(pathname) {
  const p = String(pathname || '');
  return PAGINAS_PAGAS.find((x) => p === x.prefixo || p.startsWith(`${x.prefixo}/`))?.recurso || null;
}

/* O texto do popup, por recurso. Mora aqui e não no componente porque é a
   MESMA promessa que a tela de preço faz — se divergir, a pessoa lê uma coisa
   no popup e outra no checkout. */
export const CONVITE = Object.freeze({
  [FALA]: {
    titulo: 'Falar com a Cady é do plano completo',
    linha: 'Escrever continua liberado, sempre. A conversa por voz é onde a '
      + 'pronúncia destrava — ela te ouve, corrige na hora e traz de volta '
      + 'amanhã o que travou hoje.',
  },
  [TRILHA]: {
    titulo: 'A trilha é do plano completo',
    linha: 'Conversa solta ensina o que você já sabe pedir. A trilha é o '
      + 'contrário: ela escolhe o que vem depois, na ordem que faz você '
      + 'avançar — e cobra de volta o que ficou pra trás.',
  },
});

export const CONVITE_PADRAO = Object.freeze({
  titulo: 'Isso é do plano completo',
  linha: 'Escrever com a Cady continua liberado. O resto do plano abre com o acesso.',
});

export const conviteDe = (recurso) => CONVITE[recurso] || CONVITE_PADRAO;

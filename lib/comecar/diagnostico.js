/* A FRASE DA TELA DE DIAGNÓSTICO (/comecar → 'diagnostico').

   É a primeira vez no funil em que o produto afirma ter ENTENDIDO a pessoa.
   Uma frase errada aqui não quebra nada — só faz o app parecer que não estava
   prestando atenção, que é pior.

   A tela antes fazia `a.bloqueio.toLowerCase()` e colava numa frase pronta:
   "Seu nó é falta de repertório." Isso devolve o RÓTULO DO BOTÃO, e rótulo de
   botão é escrito pra caber numa lista, não pra soar como conclusão. "Seu nó é
   falta de repertório" é a pessoa lendo a própria resposta de volta; "Sua trava
   é não achar as palavras na hora" é um diagnóstico.

   Por isso cada resposta tem frase PRÓPRIA, escrita. Custa uma linha por opção,
   e é o que separa a tela de parecer um formulário que ecoa.

   A frase quebra em `antes` + `forte` porque o destaque em rosa carrega o
   conteúdo específico — é ele que a pessoa reconhece como sendo sobre ela. Quem
   renderiza fecha com "!".

   Mora em lib/comecar/ e não dentro da tela porque é dado, não marcação: fica
   ao lado de data.js e fala.js, e assim dá pra testar sem montar React. */

// Vale pra quem não respondeu, e pra quem tem no localStorage uma opção que o
// funil não oferece mais.
export const TRAVA_PADRAO = { antes: 'Sua trava é ', forte: 'não ter com quem praticar' };

/* Vence tudo. Não é desprezar o que a pessoa escolheu em "o que mais te trava":
   é que "nunca abro a boca" é um fato de COMPORTAMENTO, e os outros são causas
   que ela atribui a si mesma. Sem repetição não existe nó pra desatar — e
   repetição diária é justamente o que o produto vende, então é essa a promessa
   honesta pra esse caso. */
export const TRAVA_SEM_PRATICA = { antes: 'Sua trava é ', forte: 'não conseguir praticar todo dia' };

// Chaves = os valores `v` da tela Bloqueio (components/comecar/screens/perfil.js).
// Opção nova lá sem entrada aqui faz o teste falhar, de propósito.
export const TRAVAS = {
  'Vergonha de errar': { antes: 'Você trava por ', forte: 'vergonha de errar com estranhos' },
  'Falta de repertório': { antes: 'Sua trava é ', forte: 'não achar as palavras na hora' },
  'Falta de prática': TRAVA_PADRAO,
  'Congelo na hora': { antes: 'Sua trava é ', forte: 'congelar na hora H' },
};

/* Pra ligar mais um eixo (objetivo, minutos por dia, prazo), é uma entrada nova
   aqui — não um `if` na tela. */
export function diagnosticoDe(a = {}) {
  if (a?.hoje === '0') return TRAVA_SEM_PRATICA;
  return TRAVAS[a?.bloqueio] || TRAVA_PADRAO;
}

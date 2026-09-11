/* A ORDEM DO FUNIL PÓS-CADASTRO, NUM LUGAR SÓ.

   Isto era uma cadeia de ifs dentro do middleware. Saiu de lá porque é a regra
   que decide pra onde cada pessoa com conta é mandada — e é o tipo de regra que
   quebra em silêncio: trocar duas linhas de lugar não derruba build nem teste,
   só passa a trancar gente do lado de fora (ou, pior, do lado de dentro sem
   pagar). Aqui ela é uma função pura, e tem teste.

   A ordem é: paga → diz o nome → app.

   O QUE SAIU: havia um primeiro passo `/onboarding` (idade, gênero, nível,
   motivos, desafios, meta), condicionado a `profiles.onboarded_at`. Fazia
   sentido quando aquele questionário ERA o onboarding. Hoje quem entra responde
   28 telas ANTES de a conta existir, e o `onboarded_at` só nasce quando essas
   respostas chegam ao banco — então a condição passou a pegar justamente quem
   já tinha respondido tudo e estava esperando a gravação. O efeito era pedir de
   novo, em outra ordem, o que a pessoa acabou de responder.

   As respostas continuam sendo gravadas (o /pagamento manda o que está no
   localStorage — ver app/pagamento/EnviaRespostas.js). Elas só deixaram de ser
   uma cancela.

   Devolve o caminho do próximo passo, ou null quando não falta nada. */
export function proximoPasso({ pago, nome }) {
  if (!pago) return '/pagamento';
  // Sem nome a Cady não tem como chamar a pessoa, e é a primeira coisa que ela
  // faz. Só é pedido depois do pagamento pra não atravessar o caixa.
  if (!String(nome || '').trim()) return '/v2/onboarding';
  return null;
}

/* As telas que SÓ existem enquanto são o passo atual. Quem chega numa delas
   fora de hora é mandado pro passo certo.

   `/onboarding` continua aqui mesmo tendo saído do funil, e é de propósito: é o
   que faz um link velho, um favorito ou um e-mail antigo caírem no passo de
   verdade em vez de abrirem um formulário aposentado. */
export const TELAS_DE_PASSO = ['/onboarding', '/v2/onboarding', '/pagamento'];

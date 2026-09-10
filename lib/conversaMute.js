/* Quem fecha e abre o microfone durante a conversa.

   A regra pedida: enquanto a Cady fala, o microfone fica mudo; quando ela para,
   volta a abrir sozinho. E a pessoa pode desmutar no meio da fala dela pra
   interromper — nesse caso a gente não fecha de novo até ela terminar de falar.

   Dois casos quebram a versão ingênua ("falando => mudo, parou => aberto"), e
   os dois precisam de memória, não só do estado atual do microfone:

   1. Quem se mutou sozinho no silêncio. No primeiro silêncio da Cady o
      microfone abriria e a pessoa voltaria a ser ouvida sem ter pedido. Por
      isso `nosso`: só devolvemos o que nós mesmos fechamos.

   2. Quem desmutou pra interromper. Basta um novo cálculo enquanto ela ainda
      fala pra fecharmos de novo em cima da pessoa. Por isso `assumido`: tocar
      no botão DURANTE a fala dela tira o microfone das nossas mãos até ela
      calar.

   Isolado do componente porque é a peça com mais casos de borda e nenhuma
   dependência de React ou do SDK — e porque depender da hora em que um efeito
   roda pra ficar correto é o tipo de coisa que quebra em silêncio. */

/* `ativo`    = sessão aberta.
   `falando`  = a Cady está falando agora.
   `mudo`     = o microfone está fechado agora.
   `nosso`    = fomos nós que fechamos.
   `assumido` = a pessoa mexeu no botão durante esta fala dela.

   Devolve { mudar, nosso, assumido }: `mudar` é o valor pro setMuted, ou null
   quando não há nada a fazer. */
export function decidirMute({ ativo, falando, mudo, nosso, assumido }) {
  // Sessão fechada: nada a mexer, e a memória toda deixa de valer.
  if (!ativo) return { mudar: null, nosso: false, assumido: false };

  if (falando) {
    // A pessoa assumiu esta fala: mão fora até ela calar.
    if (assumido) return { mudar: null, nosso, assumido: true };
    // Já mudo por escolha da pessoa: o mudo não é nosso, e não vamos devolver.
    if (mudo) return { mudar: null, nosso, assumido };
    return { mudar: true, nosso: true, assumido };
  }

  // Ela calou: a próxima fala volta a ser nossa. E só reabrimos o que fechamos.
  if (nosso) return { mudar: false, nosso: false, assumido: false };
  return { mudar: null, nosso: false, assumido: false };
}

/* A pessoa tocou no botão de mudo.

   Tocar ENQUANTO ela fala é interromper, e trava a decisão automática até ela
   calar. Tocar no silêncio é só preferência — a próxima fala pode fechar o
   microfone normalmente. Sem essa distinção, um toque qualquer desligaria o
   automático pelo resto da fala. */
export function aoTocarMute({ mudo, falando }) {
  return { mudar: !mudo, nosso: false, assumido: !!falando };
}

/* Como reconhecer um cookie de sessão do Supabase.

   Vive num arquivo sozinho, sem importar nada, por um motivo prático: o
   middleware puxa `@supabase/ssr` e `next/server`, e isso torna a regra
   impossível de testar sem subir meio Next. Uma regra que decide entre "manda
   pro login" e "mostra Reconectando" merece teste de verdade, e não uma asserção
   sobre o texto do arquivo.

   Sem esta distinção, um erro de rede na verificação vira `user: null`, e
   `user: null` vira redirect pro /login — ou seja, um soluço desloga alguém que
   estava no meio de uma conversa. Com ela, dá pra separar "esta pessoa nunca
   entrou" (não há cookie: mandar pro login é o certo) de "não consegui confirmar
   agora" (há cookie: deslogar é a pior resposta possível).

   O nome do cookie do Supabase é `sb-<ref>-auth-token`, e ele pode vir partido
   em `...auth-token.0`, `.1` quando passa do limite de tamanho — por isso a
   checagem é por prefixo, e não por nome exato.

   O `code-verifier` FICA DE FORA, e essa exclusão é o conserto de uma armadilha
   que prendeu gente de verdade. O Supabase escreve
   `sb-<ref>-auth-token-code-verifier` quando um login por Google COMEÇA, e o
   apaga quando ele termina. Se o login não termina naquele domínio — foi o que
   aconteceu na virada de endereço, com o Google ainda apontando pro domínio
   velho — o rascunho fica órfão.

   E um rascunho órfão casava com a regra acima. O portão então lia "há uma
   sessão que eu não consigo confirmar", servia a tela de "Reconectando…", e ela
   se recarregava a cada 2 segundos pra sempre: a pessoa não tinha sessão nenhuma
   e não conseguia nem chegar no login pra criar uma. O caminho certo pra quem só
   tem um verifier é o mesmo de quem não tem cookie nenhum: mandar pro login. */
export function ehCookieDeSessao(nome) {
  const n = String(nome || '');
  if (!n.startsWith('sb-') || !n.includes('auth-token')) return false;
  return !n.includes('code-verifier');
}

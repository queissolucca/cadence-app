import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/* Refreshes the auth session cookie on every request so it never silently
   expires while the user is active. Called from the root middleware.js.

   Retorna { response, user, supabase } em vez de só o Response — o
   middleware raiz reaproveita o mesmo client/getClaims() pra decidir os
   redirects de /v2 (login/onboarding) sem precisar criar um segundo client
   nem verificar o token de novo.

   POR QUE getClaims() E NÃO getUser()

   Isto roda em TODA requisição que casa com o matcher: cada página, cada
   navegação do App Router (o RSC também passa por aqui) e cada chamada de API.
   O `getUser()` sai na rede pro servidor de auth toda vez, por definição — é
   assim que ele revalida o token. Eram ~100ms carimbados em cima de cada
   clique, antes de o servidor começar a montar a resposta.

   O `getClaims()` verifica a assinatura do JWT localmente com WebCrypto, contra
   o JWKS do projeto que o SDK guarda em memória global (sobrevive entre
   requisições da mesma instância morna). Só funciona porque este projeto assina
   com chave assimétrica — ES256, conferido em /auth/v1/.well-known/jwks.json.
   Se um dia as chaves voltarem a ser simétricas, o próprio SDK cai de volta pro
   `getUser()` sozinho: fica lento outra vez, mas nunca fica inseguro.

   `user` sai com a MESMA forma de antes ({ id, email }) porque é só isso que o
   middleware usa dele — assim nada mais precisou mudar de forma. */
export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Required: getClaims() passa por getSession(), e é isso que renova o token
  // quando ele está perto de vencer (gravando o cookie novo pelo setAll acima).
  const user = await identidadeDe(supabase);

  return { response, user, supabase };
}

/* O getClaims RELANÇA o que não for erro de auth.

   Olhando a implementação do SDK: o catch dele só converte em `{data, error}`
   quando `isAuthError(error)`; qualquer outra coisa — um fetch do JWKS que
   falhou, um DNS que não resolveu — sobe. E o que sobe de dentro do middleware
   vira 500 na cara da pessoa, no site INTEIRO, porque o middleware roda em toda
   requisição.

   O `getUser()` nunca fez isso: ele devolve `{data:{user:null}, error}` e pronto.
   Trocar um pelo outro trouxe junto, sem querer, um jeito novo de o site cair.

   Então a queda é amortecida em dois degraus: se o caminho local falhar por
   motivo que não seja o token, tenta o `getUser()` — mais lento, mas é a rede
   do servidor de auth, que é outra caixa. Se os dois falharem, a pessoa é
   tratada como anônima, que é o pior caso correto (vai pro login) em vez de uma
   tela de erro. */
export async function identidadeDe(supabase) {
  try {
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (claims?.sub) return { id: claims.sub, email: claims.email || '' };
  } catch {
    /* cai no getUser abaixo */
  }
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user ? { id: data.user.id, email: data.user.email || '' } : null;
  } catch {
    return null;
  }
}

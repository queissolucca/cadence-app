import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/* Cabeçalhos com que o middleware entrega a identidade JÁ VERIFICADA pra baixo.

   Quem resolve quem é a pessoa passa a ser UM lugar só: aqui. As telas leem o
   cabeçalho em vez de perguntar de novo ao Supabase — ver lib/sessaoServidor.

   Por que isso importa mais do que parece: cada cliente criado num Server
   Component podia disparar uma RENOVAÇÃO de token. E o Supabase rotaciona o
   refresh token — quem renova primeiro invalida o dos outros. Numa conversa de
   voz há várias requisições ao mesmo tempo; com duas renovando juntas, a
   segunda recebe "Invalid Refresh Token: Already Used" e o SDK derruba a
   sessão. Pior: num Server Component a gravação de cookie é engolida (o Next
   não permite), então a rotação acontece no servidor e o navegador fica com um
   refresh token que já não vale — deslogado do nada, no meio da frase.

   Com a identidade vindo pronta daqui, as telas não tocam mais em auth. */
export const H_UID = 'x-cadence-uid';
export const H_EMAIL = 'x-cadence-email';

/* Refreshes the auth session cookie on every request so it never silently
   expires while the user is active. Called from the root middleware.js.

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
   `getUser()` sozinho: fica lento outra vez, mas nunca fica inseguro. */
export async function updateSession(request) {
  /* Os cookies que o SDK pedir pra gravar ficam aqui até o fim: a resposta é
     montada UMA vez, no final, junto com os cabeçalhos de identidade. Antes ela
     era recriada dentro do setAll, e qualquer coisa acrescentada depois dele se
     perderia. */
  const paraGravar = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // No request também, pra quem renderiza abaixo já ler o token novo.
            request.cookies.set(name, value);
            paraGravar.push({ name, value, options });
          });
        },
      },
    },
  );

  // Required: getClaims() passa por getSession(), e é isso que renova o token
  // quando ele está perto de vencer (gravando o cookie novo pelo setAll acima).
  const user = await identidadeDe(supabase);

  /* TEM COOKIE DE SESSÃO? É diferente de "tem sessão válida".

     Sem esta distinção, um erro de rede na verificação vira `user: null`, e
     `user: null` vira redirect pro /login — ou seja, um soluço desloga alguém
     que estava no meio de uma conversa. Com ela, dá pra separar "esta pessoa
     nunca entrou" (não há cookie: mandar pro login é o certo) de "não consegui
     confirmar agora" (há cookie: deslogar é a pior resposta possível).

     O nome do cookie do Supabase é `sb-<ref>-auth-token`, e ele pode vir
     partido em `...auth-token.0`, `.1` quando passa do limite de tamanho —
     por isso a checagem é por prefixo e não por nome exato. */
  const temCookieDeSessao = request.cookies.getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'));

  /* Os cabeçalhos são SEMPRE reescritos, inclusive pra apagar. Se um deles
     pudesse chegar de fora e sobreviver, qualquer pessoa se declararia dona de
     qualquer conta mandando um header — então o `delete` antes do `set` não é
     zelo, é o que torna o esquema seguro. */
  const headers = new Headers(request.headers);
  headers.delete(H_UID);
  headers.delete(H_EMAIL);
  if (user) {
    headers.set(H_UID, user.id);
    if (user.email) headers.set(H_EMAIL, user.email);
  }

  const response = NextResponse.next({ request: { headers } });
  paraGravar.forEach(({ name, value, options }) => response.cookies.set(name, value, options));

  return { response, user, supabase, temCookieDeSessao };
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
   do servidor de auth, que é outra caixa. Se os dois falharem, devolve null — e
   quem chama decide, com o `temCookieDeSessao`, se isso é "anônimo" ou só
   "não deu pra saber agora". */
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

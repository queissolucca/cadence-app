import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

/* Use inside Server Components, Route Handlers and Server Actions.

   Envolvido em `cache()` do React, que memoiza POR REQUISIÇÃO (não entre
   requisições — não é cache de dados, é dedupe). Uma tela do /v2 chama isto de
   três lugares (o layout do /v2, o layout do (app) e a própria página); sem o
   dedupe são três clients, cada um com seu próprio estado de sessão, e cada um
   refazendo o trabalho de ler e decodificar o cookie. Com ele, os três pegam o
   mesmo objeto — e, o que mais importa, o mesmo cache interno de JWKS que faz
   o getClaims() não sair na rede. */
export const createClient = cache(() => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component — the middleware refreshes the
            // session, so writes here can be safely ignored.
          }
        },
      },
    },
  );
});

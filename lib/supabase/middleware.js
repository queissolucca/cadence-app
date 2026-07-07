import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Refreshes the auth session cookie on every request so it never silently
// expires while the user is active. Called from the root middleware.js.
//
// Retorna { response, user, supabase } em vez de só o Response — o
// middleware raiz reaproveita o mesmo client/getUser() pra decidir os
// redirects de /v2 (login/onboarding) sem precisar criar um segundo client
// nem chamar getUser() de novo.
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

  // Required: touching getUser() is what actually refreshes the token.
  const { data: { user } } = await supabase.auth.getUser();

  return { response, user, supabase };
}

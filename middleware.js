import { NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

// Área /v2 (shell novo, construído em paralelo ao app atual — ver histórico
// da conversa) tem proteção de rota real: sem sessão → /login; com sessão
// mas sem baseline_question ainda → /v2/onboarding. /login é top-level (fora
// de /v2) pra virar a URL pública oficial (cadenceenglish.app/login). Fora
// de /v2 e /login, o comportamento é EXATAMENTE o de antes (só refresh de
// sessão) — nenhuma rota existente ganha redirect novo.
export async function middleware(request) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/v2', request.url));
    }
    return response;
  }

  if (!pathname.startsWith('/v2')) {
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname !== '/v2/onboarding') {
    const { data: profile } = await supabase.from('profiles').select('baseline_question').eq('id', user.id).maybeSingle();
    if (!profile?.baseline_question) {
      return NextResponse.redirect(new URL('/v2/onboarding', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

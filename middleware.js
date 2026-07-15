import { NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

// Redirects de rotas antigas/aposentadas — feitos aqui (não com redirect()
// dentro da page) porque redirect() numa página 100% estática não gera
// Location de verdade na resposta (Next só resolve isso client-side depois
// de hidratar); NextResponse.redirect() no middleware sempre manda o header
// certo, então esses paths viraram alias de verdade em vez de silenciosamente
// dependerem de JS no cliente.
const LEGACY_REDIRECTS = {
  '/': '/v2',
  '/cadence': '/inicio',
  '/cadence/onboarding': '/inicio/onboarding',
  '/v2/login': '/login',
};

// Área /v2 (shell novo, construído em paralelo ao app atual — ver histórico
// da conversa) tem proteção de rota real: sem sessão → /login; com sessão
// mas email fora de paid_emails → /pagamento; com sessão paga mas sem
// baseline_question ainda → /v2/onboarding. /login e /pagamento são
// top-level (fora de /v2) pra virar URLs públicas oficiais. Fora de /v2,
// /login e /pagamento, o comportamento é EXATAMENTE o de antes (só refresh
// de sessão) — nenhuma rota existente ganha redirect novo.
const PROTECTED_PREFIXES = ['/v2', '/pagamento'];

export async function middleware(request) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (LEGACY_REDIRECTS[pathname]) {
    return NextResponse.redirect(new URL(LEGACY_REDIRECTS[pathname], request.url));
  }

  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/v2', request.url));
    }
    return response;
  }

  if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: paidRow } = await supabase.from('paid_emails').select('email').eq('email', user.email).maybeSingle();
  const isPaid = !!paidRow;

  if (!isPaid) {
    if (pathname === '/pagamento') {
      return response;
    }
    return NextResponse.redirect(new URL('/pagamento', request.url));
  }

  if (pathname === '/pagamento') {
    return NextResponse.redirect(new URL('/v2', request.url));
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

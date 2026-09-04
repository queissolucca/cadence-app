import { NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

// Redirects de rotas antigas/aposentadas — feitos aqui (não com redirect()
// dentro da page) porque redirect() numa página 100% estática não gera
// Location de verdade na resposta (Next só resolve isso client-side depois
// de hidratar); NextResponse.redirect() no middleware sempre manda o header
// certo, então esses paths viraram alias de verdade em vez de silenciosamente
// dependerem de JS no cliente.
const LEGACY_REDIRECTS = {
  '/cadence': '/',
  '/cadence/onboarding': '/experimentar',
  '/inicio': '/',
  '/inicio/onboarding': '/experimentar',
  '/v2/login': '/login',
};

// Área /v2 (shell novo, construído em paralelo ao app atual — ver histórico
// da conversa) tem proteção de rota real: sem sessão → /login; com sessão
// mas email fora de paid_emails → /pagamento; com sessão paga mas sem
// baseline_question ainda → /v2/onboarding.
//
// /pagamento é pública (não exige sessão) porque agora é o destino do CTA
// final do onboarding (/inicio/onboarding), que roda antes de a pessoa criar
// conta. Pra quem chega logado (fluxo antigo: caiu em /v2 sem estar em
// paid_emails), a página só pula direto pro /v2 se o email já estiver pago —
// senão mostra a mesma tela.
const LOGIN_REQUIRED_PREFIXES = ['/v2'];

export async function middleware(request) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (LEGACY_REDIRECTS[pathname]) {
    return NextResponse.redirect(new URL(LEGACY_REDIRECTS[pathname], request.url));
  }

  // A raiz do site é a landing estática (public/home.html) — servida via rewrite,
  // sem mudar a URL. (Usuários logados que quiserem o app clicam em "Entrar".)
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/home.html', request.url));
  }

  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/v2', request.url));
    }
    return response;
  }

  // Onboarding pré-pagamento (5 perguntas): exige login, mas não pagamento.
  if (pathname === '/onboarding') {
    if (!user) return NextResponse.redirect(new URL('/login', request.url));
    return response;
  }

  if (pathname === '/pagamento') {
    if (!user) {
      return response;
    }
    const { data: paidRow } = await supabase
      .from('paid_emails')
      .select('email')
      .eq('email', user.email)
      .maybeSingle();
    if (paidRow) {
      return NextResponse.redirect(new URL('/v2', request.url));
    }
    // Não pago: garante que respondeu o onboarding primeiro (best-effort — se a
    // tabela não existe ainda, não bloqueia).
    const onb = await supabase.from('onboarding').select('user_id').eq('user_id', user.id).maybeSingle();
    if (!onb.error && !onb.data) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
    return response;
  }

  if (!LOGIN_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // paid_emails e profiles são independentes entre si — disparar em paralelo
  // em vez de sequencial economiza um round-trip inteiro pro Supabase em
  // toda navegação dentro de /v2 (que é a maior parte do tráfego autenticado).
  // Pra quem já não é pago, a consulta de profile sai "de graça" (resultado
  // descartado), mas ela é minúscula — sai mais barato que pagar a latência
  // sequencial no caso comum (usuário pago, que é a maioria).
  const needsBaselineCheck = pathname !== '/v2/onboarding';
  const [{ data: paidRow }, profileResult] = await Promise.all([
    supabase.from('paid_emails').select('email').eq('email', user.email).maybeSingle(),
    needsBaselineCheck
      ? supabase.from('profiles').select('baseline_question').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const isPaid = !!paidRow;

  if (!isPaid) {
    return NextResponse.redirect(new URL('/pagamento', request.url));
  }

  if (needsBaselineCheck && !profileResult.data?.baseline_question) {
    return NextResponse.redirect(new URL('/v2/onboarding', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

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

  // Funil pós-cadastro, em ORDEM fixa (pagamento é o ÚLTIMO passo):
  //   1) /onboarding      → perguntas (idade, gênero, nível, motivos, desafios, meta) + termos
  //   2) /pagamento       → paga depois de já ter preenchido tudo
  //   3) /v2/onboarding   → só o nome (último passo, depois de pagar)
  //   4) /v2              → app liberado
  // Requer as migrations 0026 (profiles.onboarded_at + tabela onboarding).
  async function nextStep() {
    const profileP = supabase.from('profiles').select('onboarded_at, full_name').eq('id', user.id).maybeSingle();
    // Pago E dentro da validade (3 meses). Fallback: se a coluna expires_at
    // ainda não existir (migration 0030), busca só o email e trata como válido.
    let paid = await supabase.from('paid_emails').select('email, expires_at').eq('email', user.email).maybeSingle();
    if (paid.error) paid = await supabase.from('paid_emails').select('email').eq('email', user.email).maybeSingle();
    const paidRow = paid.data;
    const { data: profile } = await profileP;

    if (!profile?.onboarded_at) return '/onboarding';
    // expires_at null/ausente = acesso sem expiração (grandfathered).
    const active = !!paidRow && (!paidRow.expires_at || new Date(paidRow.expires_at) > new Date());
    if (!active) return '/pagamento';
    if (!profile?.full_name || !profile.full_name.trim()) return '/v2/onboarding';
    return null; // tudo pronto → app
  }

  // As 3 telas do funil: cada uma só aparece quando é o passo atual; caso
  // contrário, manda pro passo certo (ou pro app, se já concluiu tudo).
  if (pathname === '/onboarding' || pathname === '/v2/onboarding' || pathname === '/pagamento') {
    if (!user) return NextResponse.redirect(new URL('/login', request.url));
    const step = await nextStep();
    const target = step || '/v2';
    if (target !== pathname) return NextResponse.redirect(new URL(target, request.url));
    return response;
  }

  // Resto do app (/v2/*): exige login + funil completo (inclui pagamento).
  if (LOGIN_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url));
    const step = await nextStep();
    if (step) return NextResponse.redirect(new URL(step, request.url));
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

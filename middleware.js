import { NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { apiLiberada, ehRotaApi } from './lib/apiAccess';
import { proximoPasso, TELAS_DE_PASSO } from './lib/funil';

// Redirects de rotas antigas/aposentadas — feitos aqui (não com redirect()
// dentro da page) porque redirect() numa página 100% estática não gera
// Location de verdade na resposta (Next só resolve isso client-side depois
// de hidratar); NextResponse.redirect() no middleware sempre manda o header
// certo, então esses paths viraram alias de verdade em vez de silenciosamente
// dependerem de JS no cliente.
// Rotas aposentadas. `/inicio` era a landing do funil antigo; hoje quem chega
// nela quer entrar, então vai pro login. `/inicio/onboarding` era o questionário
// pré-conta, cujo sucessor é a raiz (as 33 telas).
const LEGACY_REDIRECTS = {
  '/cadence': '/',
  '/cadence/onboarding': '/',
  '/inicio': '/login',
  '/inicio/onboarding': '/',
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

  // A raiz do site é a nova interface (as 33 telas de /comecar), servida por
  // REWRITE: a URL continua sendo cadenceenglish.app, o conteúdo é o de
  // /comecar. Rewrite e não redirect porque o endereço que a pessoa digitou é o
  // que ela deve continuar vendo na barra — e porque assim o /comecar segue
  // valendo como link direto (é pra onde o /auth/callback devolve quem entra
  // pelo Google no meio do cadastro).
  //
  // Quem já tem sessão pula tudo isso e vai pro app: abrir o site logado é
  // querer o /v2, não refazer o onboarding.
  if (pathname === '/') {
    if (user) return NextResponse.redirect(new URL('/v2', request.url));
    return NextResponse.rewrite(new URL('/comecar', request.url));
  }

  // A landing antiga (public/home.html) não foi apagada — ela tem a história do
  // fundador, o FAQ e o preço, que não existem em lugar nenhum das 33 telas.
  // Continua inteira aqui, e os links dentro dela (/experimentar, /login,
  // /privacy, /termos) seguem valendo.
  if (pathname === '/sobre') {
    return NextResponse.rewrite(new URL('/home.html', request.url));
  }

  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/v2', request.url));
    }
    return response;
  }

  // Funil pós-cadastro, em ORDEM fixa:
  //   1) /pagamento       → paga
  //   2) /v2/onboarding   → só o nome
  //   3) /v2              → app liberado
  // O /onboarding (idade, gênero, nível, motivos…) SAIU deste funil — as 28
  // telas antes da conta já perguntam tudo, e mantê-lo era pedir de novo, em
  // outra ordem, o que a pessoa acabou de responder. Ver o comentário do
  // nextStep. Requer as migrations 0026 (profiles.onboarded_at + tabela
  // onboarding).
  // Tem linha em paid_emails, dentro da validade? É a única fonte de verdade do
  // acesso. A tabela tem RLS com uma policy só (SELECT da própria linha) e
  // nenhuma de escrita — só a service_role, a partir do webhook, cria linha.
  async function acessoPago() {
    // Fallback: se a coluna expires_at ainda não existir (migration 0030),
    // busca só o email e trata como válido.
    let paid = await supabase.from('paid_emails').select('email, expires_at').eq('email', user.email).maybeSingle();
    if (paid.error) paid = await supabase.from('paid_emails').select('email').eq('email', user.email).maybeSingle();
    const row = paid.data;
    // expires_at null/ausente = acesso sem expiração (grandfathered).
    return !!row && (!row.expires_at || new Date(row.expires_at) > new Date());
  }

  // Busca os dois fatos em paralelo e deixa a ORDEM com o lib/funil, que é onde
  // ela pode ser testada. Antes a ordem morava nesta função, dentro do
  // middleware, onde nenhum teste alcança.
  async function nextStep() {
    const profileP = supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    const pagoP = acessoPago();
    const { data: profile } = await profileP;
    const pago = await pagoP;
    return proximoPasso({ pago, nome: profile?.full_name });
  }

  // ROTAS DE API. O portão de página não as cobria: nenhuma começa com '/v2'
  // (nem mesmo /api/v2/...), então todas caíam no `return response` do fim. Uma
  // conta grátis chamando POST /api/chat tinha o produto pago inteiro.
  //
  // Nega com JSON, e não com redirect: quem chama isso é fetch, e um 307 pra
  // uma página HTML vira erro de parse no cliente em vez de mensagem clara.
  if (ehRotaApi(pathname)) {
    if (apiLiberada(pathname)) return response;
    const nega = (status, erro) => {
      const r = NextResponse.json({ error: erro }, { status });
      // Preserva o refresh de cookie feito pelo updateSession — senão negar uma
      // chamada pode deslogar a pessoa no meio da sessão.
      response.cookies.getAll().forEach((c) => r.cookies.set(c));
      return r;
    };
    if (!user) return nega(401, 'not_authenticated');
    if (!(await acessoPago())) return nega(402, 'payment_required');
    return response;
  }

  // As 3 telas do funil: cada uma só aparece quando é o passo atual; caso
  // contrário, manda pro passo certo (ou pro app, se já concluiu tudo).
  // `/onboarding` continua na lista pra ser EXPULSO: ele não é mais um passo,
  // então `nextStep()` nunca o devolve, e quem cair nele (link velho, favorito,
  // e-mail antigo) é mandado pro passo de verdade em vez de ver um formulário
  // aposentado.
  if (TELAS_DE_PASSO.includes(pathname)) {
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

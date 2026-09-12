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
  const { response, user, supabase, temCookieDeSessao } = await updateSession(request);

  /* NUNCA DESLOGAR POR DÚVIDA.

     `user` nulo tinha um significado só — "anônimo" — e anônimo vira redirect
     pro /login. Mas ele fica nulo por DOIS motivos bem diferentes: não há
     sessão nenhuma, ou não deu pra confirmar a que existe (rede caída no meio
     de uma chamada de voz, JWKS que não respondeu, token em renovação). O
     segundo caso deslogava alguém no meio da conversa.

     `precisaLogar` é o único lugar que decide isso agora: sem cookie de sessão,
     é anônimo de verdade. Com cookie e sem confirmação, a pessoa FICA onde
     está — a dúvida não tira ninguém de lugar nenhum, é a mesma regra do
     portão de pagamento logo abaixo. */
  const precisaLogar = !user && !temCookieDeSessao;
  const semConfirmar = !user && temCookieDeSessao;

  /* Sem identidade, a tela do app não tem como ser montada — ela é feita do
     perfil, do streak, das conversas da pessoa. Servir a página levaria a um
     erro; deslogar é o que a gente acabou de parar de fazer. A terceira saída é
     esta: um REWRITE pra uma tela que só diz "reconectando" e recarrega em 2s.

     Rewrite e não redirect de propósito: a URL na barra continua sendo a que a
     pessoa estava (/v2/conversar, por exemplo), então o reload volta exatamente
     pra lá. Nada se perde, e o caso se resolve sozinho. */
  const reconectando = () => NextResponse.rewrite(new URL('/reconectando', request.url));
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
  /* FALHA DE LEITURA NÃO É PROVA DE NADA.

     Este é o conserto de um bug que tirava a pessoa do meio da conversa. O
     `maybeSingle()` devolve `{data:null, error:null}` quando não há linha e
     `{data:null, error:<algo>}` quando a consulta FALHOU — e o código antigo
     olhava só o `data`, então tratava os dois como "não pagou".

     O estrago: o middleware roda a CADA requisição, e uma chamada de voz satura
     a conexão. Um errinho de rede numa dessas consultas expulsava a pessoa pro
     /pagamento; lá a consulta ia bem, ela já tinha pago, e o middleware a
     mandava pro /v2. Da cadeira dela: estava conversando e, do nada, caiu na
     tela de início — o pulo pelo /pagamento é rápido demais pra ser visto.

     Agora `null` = não pagou (isso é evidência), e `undefined` = não deu pra
     saber (isso não é). Quem chama decide o que fazer com a dúvida. */
  async function acessoPago() {
    // Fallback: se a coluna expires_at ainda não existir (migration 0030),
    // busca só o email e trata como válido.
    let paid = await supabase.from('paid_emails').select('email, expires_at').eq('email', user.email).maybeSingle();
    if (paid.error) paid = await supabase.from('paid_emails').select('email').eq('email', user.email).maybeSingle();
    if (paid.error) return undefined;   // a consulta falhou: não sabemos
    const row = paid.data;
    // expires_at null/ausente = acesso sem expiração (grandfathered).
    return !!row && (!row.expires_at || new Date(row.expires_at) > new Date());
  }

  // Busca os dois fatos em paralelo e deixa a ORDEM com o lib/funil, que é onde
  // ela pode ser testada. Antes a ordem morava nesta função, dentro do
  // middleware, onde nenhum teste alcança.
  //
  // Devolve `undefined` quando alguma leitura falhou — diferente de `null`, que
  // é "não falta nada". Ver proximoPasso em lib/funil.js.
  async function nextStep() {
    const profileP = supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    const pagoP = acessoPago();
    const perfil = await profileP;
    const pago = await pagoP;
    if (perfil.error || pago === undefined) return undefined;
    return proximoPasso({ pago, nome: perfil.data?.full_name });
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
    // Sem confirmar ≠ sem sessão: 401 aqui faria o cliente tratar como sessão
    // morta. 503 diz "tenta de novo", que é o que de fato aconteceu.
    if (semConfirmar) return nega(503, 'try_again');
    if (!user) return nega(401, 'not_authenticated');
    const pago = await acessoPago();
    // Aqui a dúvida NEGA, ao contrário das páginas: cada chamada liberada por
    // engano queima token da Anthropic ou minuto do ElevenLabs, e errar pra
    // menos custa uma tentativa repetida — errar pra mais custa dinheiro.
    if (pago === undefined) return nega(503, 'try_again');
    if (!pago) return nega(402, 'payment_required');
    return response;
  }

  // As 3 telas do funil: cada uma só aparece quando é o passo atual; caso
  // contrário, manda pro passo certo (ou pro app, se já concluiu tudo).
  // `/onboarding` continua na lista pra ser EXPULSO: ele não é mais um passo,
  // então `nextStep()` nunca o devolve, e quem cair nele (link velho, favorito,
  // e-mail antigo) é mandado pro passo de verdade em vez de ver um formulário
  // aposentado.
  if (TELAS_DE_PASSO.includes(pathname)) {
    if (precisaLogar) return NextResponse.redirect(new URL('/login', request.url));
    if (semConfirmar) return reconectando();
    const step = await nextStep();
    // Não deu pra saber: fica onde está. Mandar pra algum lugar com base num
    // palpite é o que embaralhava o funil quando o banco engasgava.
    if (step === undefined) return response;
    const target = step || '/v2';
    if (target !== pathname) return NextResponse.redirect(new URL(target, request.url));
    return response;
  }

  /* Resto do app (/v2/*): exige login + funil completo (inclui pagamento).

     Na dúvida (leitura falhou), a pessoa CONTINUA na página. Isso não é abrir a
     porta: ela já está do lado de dentro, e passou pelo portão pra chegar aqui —
     tirá-la por causa de um erro de rede é punir o usuário pelo soluço do banco.
     A porta de verdade, a que custa dinheiro, é a das rotas de API logo acima, e
     lá a dúvida continua NEGANDO. */
  if (LOGIN_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (precisaLogar) return NextResponse.redirect(new URL('/login', request.url));
    if (semConfirmar) return reconectando();
    const step = await nextStep();
    if (step === undefined) return response;
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

/* Quais rotas de API funcionam sem acesso pago.

   O portão de pagamento só existia pra páginas sob /v2. Toda rota de API começa
   com `/api`, então nenhuma delas passava pelo portão — e nenhuma checava
   pagamento por conta própria. Na prática: bastava criar uma conta grátis e
   chamar POST /api/chat, GET /api/convai/signed-url ou /api/v2/roleplay/start
   direto pra ter o produto inteiro sem pagar, queimando token da Anthropic e
   minuto do ElevenLabs. (Note que `/api/v2/...` NÃO começa com `/v2` — o `/api`
   na frente já matava o match.)

   A lista aqui é de EXCEÇÕES, não de protegidas: qualquer rota nova nasce
   fechada. Numa paywall, o default seguro é negar — esquecer de proteger custa
   dinheiro, esquecer de liberar aparece no primeiro teste.

   As exceções são de três tipos, e cada uma tem um motivo pra existir:

   1. Chamadas EXTERNAS, que não têm sessão nenhuma e se protegem por segredo
      próprio (os webhooks de pagamento).
   2. O DEMO público, que existe justamente pra quem ainda não tem conta.
   3. O próprio FUNIL até o pagamento. Este é o mais importante: barrar
      /api/checkout trancaria a porta da loja por fora — a pessoa não
      conseguiria pagar porque não pagou. */

const EXATAS = new Set([
  // --- o funil, antes do pagamento ---
  '/api/checkout',                 // é por aqui que se paga
  '/api/checkout/status',          // o /obrigado consulta enquanto espera o webhook
  '/api/onboarding',               // grava as respostas das 33 telas
  '/api/terms/accept',             // aceite dos termos, no cadastro
  '/api/account/password',         // definir/trocar senha não depende de ter pago
  '/api/account/password/record',
  '/api/track/event',              // telemetria; nada de conteúdo
  // --- demo público ---
  '/api/convai/demo-signed-url',
]);

const PREFIXOS = [
  '/api/webhooks/',   // AbacatePay e Kiwify: sem sessão, protegidos por segredo
  '/api/demo/',       // conversa de demonstração, pré-cadastro
];

/* SEGUNDO NÍVEL: rotas que exigem LOGIN mas não pagamento.

   O modelo virou freemium — escrever com a Cady é livre pra quem tem conta,
   falar e a trilha são pagos. Isso não podia ser feito invertendo o default:
   a lista de cima é de exceções JUSTAMENTE porque rota nova tem que nascer
   fechada, e uma rota cara liberada por esquecimento custa dinheiro todo dia
   até alguém notar. Então o freemium também é uma lista explícita.

   O que está fora daqui continua pago: voz (/api/convai/signed-url,
   /api/conversar/saudacao), a trilha inteira (/api/exercise/*, roleplay,
   cenários) e a revisão FALADA (/api/review/practice). */
const GRATIS_EXATAS = new Set([
  '/api/chat',                     // a escrita — é o produto grátis
  '/api/conversations',
  '/api/daily',
  '/api/profile',
  '/api/profile/preferences',
  '/api/profile/themes',
  '/api/session/complete',
  '/api/track/progress',
  '/api/feedback',
  '/api/creators',                 // formulário "Para Creators" da aba Perfil
  '/api/onboarding/complete',
  '/api/before-after',
  '/api/baseline',
  '/api/baseline/answer',
  '/api/evaluate',                 // corrige o que foi ESCRITO
  '/api/snapshot/submit',
  '/api/diagnostic/submit',
  '/api/weak-training',
  '/api/memory',
  '/api/memory/extract',
  // revisão escrita: ver e adiar cartão não depende de falar
  '/api/review',
  '/api/review/defer',
  '/api/review/example',
  '/api/review/extract',
]);

/* Rotas com id na URL (/api/review/abc). O middleware vê o caminho resolvido,
   então prefixo é a única forma de alcançá-las. Cada um aqui é um prefixo
   ESTREITO de propósito: '/api/review/' solto liberaria /api/review/practice,
   que é a revisão falada e é paga. */
const GRATIS_PREFIXOS = [
  '/api/conversations/',
  '/api/memory/',
];

/* Esta rota funciona pra quem tem conta mas não pagou? */
export function apiDoPlanoGratis(pathname) {
  if (GRATIS_EXATAS.has(pathname)) return true;
  return GRATIS_PREFIXOS.some((p) => pathname.startsWith(p));
}

export const ROTAS_GRATIS = Object.freeze([...GRATIS_EXATAS]);
export const PREFIXOS_GRATIS = Object.freeze([...GRATIS_PREFIXOS]);

export const ehRotaApi = (pathname) => pathname === '/api' || pathname.startsWith('/api/');

/* Esta rota de API pode ser usada por quem não pagou? */
export function apiLiberada(pathname) {
  if (EXATAS.has(pathname)) return true;
  return PREFIXOS.some((p) => pathname.startsWith(p));
}

// Exportadas pro teste conseguir afirmar sobre a lista inteira, e não só sobre
// os casos que alguém lembrou de escrever.
export const ROTAS_LIBERADAS = Object.freeze([...EXATAS]);
export const PREFIXOS_LIBERADOS = Object.freeze([...PREFIXOS]);

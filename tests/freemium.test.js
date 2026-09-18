import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { apiLiberada, apiDoPlanoGratis, ehRotaApi, ROTAS_GRATIS } from '../lib/apiAccess.js';
import { proximoPasso } from '../lib/funil.js';
import { recursoPagoDaPagina, conviteDe, FALA, TRILHA } from '../lib/acesso.js';

/* O MODELO: escrever com a Cady é grátis pra quem tem conta; FALAR e a TRILHA
   são pagos. Quem não pagou entra, usa, e encontra o caixa num popup — em vez
   de ser expulso na porta.

   O risco desse desenho não é alguém ver o popup demais. É o contrário: uma
   rota cara cair no plano grátis por engano e queimar minuto de ElevenLabs ou
   token da Anthropic em silêncio, todo dia, até alguém olhar a fatura. Os
   testes abaixo cercam esse lado. */

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');

describe('o que custa dinheiro continua pago', () => {
  const CARAS = [
    ['/api/convai/signed-url', 'a voz — cada minuto é ElevenLabs'],
    ['/api/conversar/saudacao', 'abre a sessão de voz'],
    ['/api/review/practice', 'revisão FALADA'],
    ['/api/exercise/submit', 'trilha'],
    ['/api/exercise/explain', 'trilha'],
    ['/api/v2/roleplay/start', 'trilha'],
    ['/api/v2/roleplay/turn', 'trilha'],
    ['/api/roleplay/turn', 'trilha'],
    ['/api/scenario/active', 'trilha'],
  ];

  it.each(CARAS)('%s não é grátis (%s)', (rota) => {
    expect(apiDoPlanoGratis(rota), `${rota} caiu no plano grátis`).toBe(false);
    expect(apiLiberada(rota), `${rota} está aberta sem login`).toBe(false);
  });

  it("'/api/review/' não vaza pra /api/review/practice", () => {
    /* O prefixo solto seria a forma óbvia de liberar a revisão escrita — e
       levaria a falada junto, que usa voz. Por isso a lista tem as rotas
       exatas, e não o prefixo. */
    expect(apiDoPlanoGratis('/api/review')).toBe(true);
    expect(apiDoPlanoGratis('/api/review/defer')).toBe(true);
    expect(apiDoPlanoGratis('/api/review/practice')).toBe(false);
  });
});

describe('o plano grátis é uma lista explícita, não um default', () => {
  it('rota inventada nasce fechada', () => {
    // A propriedade que sustenta tudo: esquecer de proteger tem que ser
    // impossível, porque custa dinheiro; esquecer de liberar aparece no
    // primeiro teste manual.
    for (const inventada of ['/api/coisa-nova', '/api/v3/caro', '/api/tts/gerar']) {
      expect(apiDoPlanoGratis(inventada)).toBe(false);
      expect(apiLiberada(inventada)).toBe(false);
    }
  });

  it('escrever com a Cady é o que está grátis', () => {
    expect(apiDoPlanoGratis('/api/chat')).toBe(true);
    expect(ROTAS_GRATIS).toContain('/api/chat');
  });

  it('as rotas com id na URL são alcançadas por prefixo', () => {
    expect(apiDoPlanoGratis('/api/conversations/abc-123')).toBe(true);
    expect(apiDoPlanoGratis('/api/memory/xyz')).toBe(true);
  });

  it('tudo que é grátis também é rota de API', () => {
    for (const r of ROTAS_GRATIS) expect(ehRotaApi(r)).toBe(true);
  });
});

describe('o middleware aplica na ordem certa', () => {
  const MW = ler('middleware.js');

  it('o plano grátis é checado depois do login e antes do pagamento', () => {
    const iLogin = MW.indexOf("nega(401, 'not_authenticated')");
    const iGratis = MW.indexOf('apiDoPlanoGratis(pathname)');
    const iPago = MW.indexOf('const pago = await acessoPago();');
    expect(iLogin).toBeGreaterThan(-1);
    expect(iGratis).toBeGreaterThan(iLogin);   // sem sessão continua 401
    expect(iPago).toBeGreaterThan(iGratis);    // e nem consulta paid_emails
  });

  it('a API continua negando na dúvida', () => {
    // Um popup se fecha no inspetor; um 402 não. O portão de verdade é este.
    expect(MW).toContain("if (pago === undefined) return nega(503, 'try_again');");
    expect(MW).toContain("if (!pago) return nega(402, 'payment_required');");
  });
});

describe('o caixa aparece onde faz sentido', () => {
  it('não expulsa mais ninguém na porta', () => {
    expect(proximoPasso({ pago: false, nome: 'Lucca' })).toBeNull();
  });

  it('a trilha é página paga; a de conversar não', () => {
    expect(recursoPagoDaPagina('/v2/trilha')).toBe(TRILHA);
    expect(recursoPagoDaPagina('/v2/trilha/unidade-3')).toBe(TRILHA);
    /* /v2/conversar abre no modo ESCREVER, que é grátis. Pôr a página na lista
       faria o popup abrir em cima de um recurso a que a pessoa tem direito. */
    expect(recursoPagoDaPagina('/v2/conversar')).toBeNull();
    expect(recursoPagoDaPagina('/v2')).toBeNull();
  });

  it('cada recurso tem um convite próprio, e nenhum fica sem texto', () => {
    for (const r of [FALA, TRILHA]) {
      expect(conviteDe(r).titulo.length).toBeGreaterThan(8);
      expect(conviteDe(r).linha.length).toBeGreaterThan(40);
    }
    expect(conviteDe('recurso-que-nao-existe').titulo).toBeTruthy();
  });
});

describe('escrever é o primeiro caminho', () => {
  const view = ler('components/v2/ConversarView.js');

  it('a tela de conversar abre no texto, não no microfone', () => {
    // Abrir no microfone faria a primeira coisa do produto ser dizer não.
    expect(view).toMatch(/useState\('text'\)/);
  });

  it('todo caminho pro modo voz passa pela porta', () => {
    /* A ORDEM INVERTEU, de propósito. Antes o `pedirPlano` vinha ANTES e
       impedia a troca de modo: a pessoa via a oferta sobre a tela de escrever,
       sem nunca ver o que estava comprando. Agora ela entra no modo voz — vê a
       Cady, o microfone, o desenho todo — e o popup sobe por cima.

       Então a asserção deixou de ser sobre ordem e passou a ser sobre
       VIZINHANÇA: todo `setMode('voice')` precisa ter um `pedirPlano` por
       perto, antes ou depois. Um sozinho seria porta lateral pro que é pago. */
    const chamadas = [...view.matchAll(/setMode\('voice'\)/g)];
    expect(chamadas.length, 'nenhum caminho pro modo voz — a tela quebrou?')
      .toBeGreaterThan(0);
    const desacompanhadas = chamadas.filter((m) => {
      const perto = view.slice(Math.max(0, m.index - 200), m.index + 200);
      return !perto.includes('pedirPlano');
    });
    expect(desacompanhadas.length, "setMode('voice') sem pedirPlano por perto").toBe(0);
    expect(view).toContain('pedirPlano(FALA,');
  });

  it('fechar o popup devolve pro Escrever, sem navegar', () => {
    /* Falar não é rota, é um modo. Fechar ali não pode mandar a pessoa pra
       outro lugar: ela perderia a conversa que estava escrevendo. Por isso o
       `pedirPlano` aceita o que desfazer. */
    expect(view).toMatch(/pedirPlano\(FALA, \(\) => setMode\('text'\)\)/);
    expect(ler('components/v2/PortaoProvider.js')).toContain('desfazer.current');
  });

  it('a tela de voz não gasta rede pra quem só está espiando', () => {
    // Montar o cliente busca URL assinada no ElevenLabs; pra quem não pagou ela
    // volta 402 e some num catch — chamada desperdiçada a cada espiada.
    expect(view).toMatch(/vitrine=\{!temPlano\}/);
    const cliente = ler('components/v2/ConversationClient.js');
    expect(cliente).toMatch(/if \(vitrine\) return;/);
  });
});

describe('a trilha aparece mesmo pra quem não pagou', () => {
  it.each([['components/ui/TabBar.js'], ['components/v2/Sidebar.js']])(
    '%s mostra a aba com cadeado em vez de escondê-la', (arquivo) => {
      const src = ler(arquivo);
      // Aba escondida não vende nada: ninguém procura o que não sabe que existe.
      expect(src).toContain("label: 'Trilha'");
      expect(src).toMatch(/pago: 'trilha'/);
    });

  it.each([['components/ui/TabBar.js'], ['components/v2/Sidebar.js']])(
    '%s DEIXA o clique passar — quem abre o popup é a página', (arquivo) => {
      /* A aba interceptava o clique e a pessoa não saía do lugar: via o popup
         sobre a tela em que já estava. Agora ela ENTRA na trilha e o popup abre
         por cima, com a tela aparecendo no fundo — vender o que a pessoa nunca
         viu é mais difícil do que mostrar.

         Ler a ROTA em vez do clique cobre de graça quem chega por link direto,
         favorito ou "abrir em nova aba": nenhum desses passa por clique. */
      expect(ler(arquivo), 'a aba voltou a engolir o clique')
        .not.toContain('pedirPlano(pago)');
    });

  it('o popup abre pela rota, e fechar devolve pro início', () => {
    const prov = ler('components/v2/PortaoProvider.js');
    expect(prov).toContain('recursoPagoDaPagina(caminho)');
    // Só esconder o popup deixaria a pessoa parada numa tela que ela não pode
    // usar, sem saída além do botão de voltar do navegador.
    expect(prov).toMatch(/router\.push\('\/v2'\)/);
  });

  it('a Início não oferece a trilha por um segundo caminho', () => {
    /* A trilha já é uma aba. Ter o cartão junto punha duas portas pro mesmo
       lugar lado a lado, e a pessoa escolhendo entre elas sem motivo. */
    expect(ler('app/v2/(app)/page.js')).not.toContain('href="/v2/trilha"');
  });
});

describe('a conversa escrita cabe numa tela de celular', () => {
  const chat = ler('components/v2/TextChatClient.js');

  it('a altura desconta o resto da tela, em vez de chutar uma fração', () => {
    /* Era `min(56vh, 460px)`: 56% de uma tela que também tem título, semana,
       o par Escrever/Falar, o campo de digitar e a barra de abas. A soma não
       cabia, e a PÁGINA rolava — a tela inteira se mexendo enquanto a pessoa
       conversa. */
    expect(chat).toMatch(/calc\(100dvh - \d+px\)/);
  });

  it('usa dvh, e não vh', () => {
    /* No Safari do iPhone, `100vh` é o viewport EXPANDIDO — o tamanho com a
       barra do navegador escondida. Com a barra à mostra, que é o normal, uma
       fração de vh já é maior do que a mesma fração do que se enxerga. */
    expect(chat).toMatch(/dvh/);
    expect(chat, 'vh puro na altura da caixa volta a estourar no iPhone')
      .not.toMatch(/height:\s*'min\(\d+vh/);
  });

  it('tem piso, pra tela curta não virar uma fresta', () => {
    expect(chat).toMatch(/clamp\(\d+px,/);
  });

  it('a rolagem para dentro da caixa', () => {
    // Sem `contain`, chegar ao fim da conversa continua rolando a página atrás.
    expect(chat).toMatch(/overflowY:\s*'auto'/);
    expect(chat).toMatch(/overscrollBehavior:\s*'contain'/);
  });
});

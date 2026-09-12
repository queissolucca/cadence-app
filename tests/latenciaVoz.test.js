import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { criarMedidor, LIMIAR_VAD, FALA_MINIMA_MS, TETO_MS } from '../lib/latenciaVoz.js';

/* "ELA DEMORA PRA RESPONDER" PRECISA VIRAR NÚMERO.

   E não um número qualquer: o que a pessoa sente é o SILÊNCIO entre ela parar de
   falar e a Cady começar a falar. Não é o tempo do modelo, nem o da rede —
   nenhum dos dois é perceptível sozinho.

   O que este medidor tem de valor é separar a culpa em duas metades que se
   consertam em lugares diferentes: `ouvir` (detecção de fim de turno + ASR, que
   mora na configuração do agente no ElevenLabs) e `pensar` (LLM + TTS, que mora
   no modelo e no tamanho do prompt). Sem essa separação, "está lento" não diz
   onde mexer. */

const medidorDe = () => {
  const rel = { t: 0 };
  const m = criarMedidor({ agora: () => rel.t });
  return { m, em: (t) => { rel.t = t; } };
};

describe('o relógio da resposta', () => {
  it('mede do fim da fala da pessoa até o primeiro ÁUDIO dela', () => {
    const { m, em } = medidorDe();
    em(0); m.vad(0.9);
    em(1200); m.vad(0.05);       // parou de falar
    em(1500); m.transcreveu();   // a transcrição dela chegou
    em(2300);
    expect(m.respondeu()).toEqual({ total: 2300 - 1200, ouvir: 300, pensar: 800, ferramentas: 0 });
  });

  /* O marco é o ÁUDIO, e não o texto da resposta, de propósito: a transcrição da
     Cady costuma chegar antes do som. Cravar nela daria um número melhor do que
     a experiência real — e um número que melhora sozinho não serve pra decidir
     nada. */
  it('só o PRIMEIRO áudio do turno conta', () => {
    const { m, em } = medidorDe();
    em(0); m.vad(0.9); em(900); m.vad(0);
    em(1800); expect(m.respondeu()).not.toBeNull();
    em(1830); expect(m.respondeu(), 'os pedaços seguintes não são novos turnos').toBeNull();
    em(1860); expect(m.respondeu()).toBeNull();
    expect(m.resumo().turnos).toBe(1);
  });

  it('sem transcrição, ainda mede o total — só não sabe repartir a culpa', () => {
    const { m, em } = medidorDe();
    em(0); m.vad(0.8); em(700); m.vad(0.1);
    em(1900);
    expect(m.respondeu()).toEqual({ total: 1200, ouvir: null, pensar: null, ferramentas: 0 });
  });
});

describe('o que NÃO é um turno', () => {
  it('um estalo curto não vira medição', () => {
    // Sem isto, cada "hmm" e cada ruído de fundo entra na média como um turno
    // que nunca existiu, e a média para de descrever a conversa.
    const { m, em } = medidorDe();
    em(0); m.vad(0.9);
    em(FALA_MINIMA_MS - 50); m.vad(0);
    em(800);
    expect(m.respondeu()).toBeNull();
    expect(m.resumo()).toBeNull();
  });

  it('silêncio longo é o agente retomando, não resposta lenta', () => {
    // O turn_timeout do painel faz a Cady retomar sozinha depois de segundos de
    // silêncio. Medir isso como latência mentiria pra muito pior.
    const { m, em } = medidorDe();
    em(0); m.vad(0.9); em(1000); m.vad(0);
    em(1000 + TETO_MS + 1);
    expect(m.respondeu()).toBeNull();
  });

  it('interromper descarta o turno pendente', () => {
    const { m, em } = medidorDe();
    em(0); m.vad(0.9); em(1000); m.vad(0);
    m.descartar();
    em(1500);
    expect(m.respondeu()).toBeNull();
  });

  it('o limiar separa voz de ruído de fundo', () => {
    const { m, em } = medidorDe();
    em(0); m.vad(LIMIAR_VAD - 0.01);   // ruído: não começa fala nenhuma
    em(900); m.vad(0);
    em(1500);
    expect(m.respondeu()).toBeNull();
  });
});

describe('as ferramentas entram na conta do silêncio', () => {
  /* A Cady chama save_to_review sozinha a cada correção que faz — está no system
     prompt. Cada chamada é uma ida a mais ao modelo ANTES de ela abrir a boca.
     Contar isso é o que permite responder "a auto-captura custa quanto?" com um
     número em vez de um palpite. */
  it('conta quantas ferramentas o turno pediu', () => {
    const { m, em } = medidorDe();
    em(0); m.vad(0.9); em(800); m.vad(0);
    em(1000); m.transcreveu();
    em(1200); m.ferramenta();
    em(2400);
    expect(m.respondeu().ferramentas).toBe(1);
    expect(m.resumo().turnosComFerramenta).toBe(1);
  });
});

describe('a janela em que a pessoa fala e não é ouvida', () => {
  /* O app fecha o microfone enquanto a Cady fala — é o preço de não ter
     barge-in. Entre "ela calou" e "o microfone abriu" existe um buraco em que a
     pessoa pode já estar falando. Ele não aparece na latência de resposta (o
     relógio dela só começa quando há voz), mas aparece pro usuário do jeito
     pior: ele fala, repete, e a conversa parece lenta. É a única parte do atraso
     que mora no nosso código. */
  it('mede do "ela calou" até o microfone reabrir', () => {
    const { m, em } = medidorDe();
    em(0); m.vad(0.9); em(600); m.vad(0); em(1400); m.respondeu();
    em(5000); m.agenteParou();
    em(5180); m.micAberto();
    expect(m.resumo().microfoneMedianaMs).toBe(180);
  });

  it('microfone aberto sem ela ter calado não conta', () => {
    const { m, em } = medidorDe();
    em(0); m.vad(0.9); em(600); m.vad(0); em(1400); m.respondeu();
    em(3000); m.micAberto();   // a pessoa desmutou sozinha, por exemplo
    expect(m.resumo().microfoneMedianaMs).toBeNull();
  });
});

describe('o resumo', () => {
  it('mediana e p90 de vários turnos', () => {
    const { m, em } = medidorDe();
    let t = 0;
    for (const atraso of [800, 1000, 1200, 900, 3000]) {
      em(t); m.vad(0.9);
      em(t + 600); m.vad(0);
      em(t + 600 + atraso); m.respondeu();
      t += 10000;
    }
    const r = m.resumo();
    expect(r.turnos).toBe(5);
    expect(r.medianaMs).toBe(1000);
    expect(r.piorMs).toBe(3000);
    expect(r.mediaMs).toBe(1380);
  });

  it('sem turno nenhum, devolve null em vez de zeros', () => {
    // Zero seria lido como "instantâneo" num painel. Null é "não medi".
    expect(criarMedidor().resumo()).toBeNull();
  });
});

describe('o medidor está de fato ligado na conversa', () => {
  const FONTE = readFileSync('components/v2/ConversationClient.js', 'utf8');
  it('os quatro marcos vêm de eventos do SDK', () => {
    expect(FONTE).toMatch(/onVadScore: \(\{ vadScore \} = \{\}\) => \{ medidor\.current\?\.vad\(vadScore\); \}/);
    expect(FONTE).toMatch(/onAudio: \(\) => \{/);
    expect(FONTE).toMatch(/onAgentToolRequest: \(\) => \{ medidor\.current\?\.ferramenta\(\); \}/);
    expect(FONTE).toMatch(/if \(role === 'you'\) medidor\.current\?\.transcreveu\(\)/);
  });

  it('o resumo vai junto no encerramento, medindo ou não na tela', () => {
    // A leitura na tela é opcional; o registro não é. É dele que sai a média de
    // quem está usando de verdade, não a de quem estava testando.
    expect(FONTE).toMatch(/latencia: medidor\.current\?\.resumo\(\) \|\| null/);
  });

  it('a leitura na tela fica atrás de um interruptor', () => {
    expect(FONTE).toContain("cadence.latencia");
    expect(FONTE).toMatch(/mostrarLatencia && latencia/);
  });
});

describe('o que estava no caminho entre o toque e a primeira palavra', () => {
  const FONTE = readFileSync('components/v2/ConversationClient.js', 'utf8');
  const ROTA = readFileSync('app/api/convai/signed-url/route.js', 'utf8');

  it('o signed URL é buscado ao abrir a tela, não ao tocar', () => {
    expect(FONTE).toContain('const aquecerUrl = useCallback');
    expect(FONTE).toMatch(/urlPronta\.current = \{ voz: null, url: null, em: 0 \};\s*\/\/ uso único/);
  });

  it('microfone e signed URL são pedidos JUNTOS', () => {
    // Em fila, a espera do microfone (no iOS, abrir uma sessão de áudio não é
    // instantâneo) era somada à da API em vez de acontecer junto.
    expect(FONTE).toMatch(/await Promise\.all\(\[\s*\n\s*navigator\.mediaDevices\.getUserMedia/);
  });

  it('a rota não vai mais à rede pra saber quem é o usuário', () => {
    // O middleware já resolveu e verificou a identidade nesta mesma requisição.
    // Sem comentários: o de lá CITA o getUser antigo pra explicar por que saiu.
    const codigo = ROTA.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    expect(codigo).toContain('const eu = await identidade()');
    expect(codigo, 'ida à rede de volta no caminho crítico').not.toContain('auth.getUser()');
  });
});

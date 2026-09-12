import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { contextoDeRetomada, deveRetomar, MAX_RETOMADAS, MINIMO_MS, ORCAMENTO } from '../lib/retomada.js';

/* DOIS SINTOMAS, UM DEFEITO DE DESENHO.

   A conversa por voz gravava no `onDisconnect` e em lugar nenhum mais. Isso
   quer dizer que o histórico só existia se a conversa terminasse BEM — e as
   duas queixas que chegaram juntas ("ela trava na 3ª fala" e "não salva nada")
   são a mesma coisa vista de dois lados: quando a conversa morre torto, o
   momento do save nunca chega.

   O chat de TEXTO nunca teve esse problema porque grava a cada turno. Estes
   testes seguram a voz no mesmo contrato, e seguram os limites da retomada
   automática — que é dinheiro: cada sessão reaberta é minuto pago. */

const FONTE = readFileSync('components/v2/ConversationClient.js', 'utf8');
const CADY = readFileSync('components/v2/CadyLive.js', 'utf8');
const ROTA = readFileSync('app/api/conversations/[id]/route.js', 'utf8');

describe('contexto de retomada', () => {
  const falas = [
    { role: 'you', text: 'I went to the beach yesterday' },
    { role: 'coach', text: 'Nice! Which beach?' },
  ];

  it('entrega a conversa como diálogo, mandando continuar e não recomeçar', () => {
    const ctx = contextoDeRetomada(falas, 'praia');
    expect(ctx).toContain('Student: I went to the beach yesterday');
    expect(ctx).toContain('Coach: Nice! Which beach?');
    expect(ctx).toContain('praia');
    // A instrução que impede a Cady de se apresentar de novo no meio da conversa.
    expect(ctx).toMatch(/don't restart/i);
  });

  it('sem fala nenhuma, não inventa contexto', () => {
    // String vazia importa: ela vira `prior_context: ''`, e o prompt do agente
    // trata vazio como "conversa nova". Um texto de moldura sem diálogo faria a
    // Cady agir como se já tivessem conversado.
    expect(contextoDeRetomada([], 'x')).toBe('');
    expect(contextoDeRetomada(null, 'x')).toBe('');
    expect(contextoDeRetomada(undefined)).toBe('');
  });

  it('corta pelo trecho RECENTE quando a conversa é longa', () => {
    // Isto vai dentro do prompt a cada sessão: reenviar uma hora de conversa
    // inteira custa token e come a janela do modelo — que é uma das coisas que
    // faz um agente parar de responder.
    const muitas = Array.from({ length: 400 }, (_, i) => ({ role: i % 2 ? 'coach' : 'you', text: `fala numero ${i} com um tanto de texto pra encher` }));
    const ctx = contextoDeRetomada(muitas, 'tema');
    expect(ctx.length).toBeLessThan(ORCAMENTO + 800);
    expect(ctx).toContain('…');
    expect(ctx, 'o que sobra tem que ser o FIM da conversa').toContain('fala numero 399');
    expect(ctx).not.toContain('fala numero 0 ');
  });
});

describe('quando o app reabre a conversa sozinho', () => {
  const base = { motivo: 'agent', pedido: false, aberta: true, falas: 8, duracaoMs: 120000, jaRetomou: 0 };

  it('o agente derrubou uma conversa aberta em andamento: reabre', () => {
    expect(deveRetomar(base)).toBe(true);
    expect(deveRetomar({ ...base, motivo: 'error' })).toBe(true);
  });

  it('quem encerrou foi a pessoa: nunca reabre', () => {
    // O pior bug possível aqui seria reabrir depois do "Encerrar": a pessoa
    // desliga e o microfone volta sozinho, gravando e cobrando.
    expect(deveRetomar({ ...base, motivo: 'user' })).toBe(false);
    expect(deveRetomar({ ...base, pedido: true })).toBe(false);
    expect(deveRetomar({ ...base, motivo: 'user', pedido: true })).toBe(false);
  });

  it('lição e revisão não são reabertas — lá o agente encerrar é o certo', () => {
    expect(deveRetomar({ ...base, aberta: false })).toBe(false);
  });

  it('caiu logo no começo é configuração errada, não teto atingido', () => {
    expect(deveRetomar({ ...base, duracaoMs: MINIMO_MS - 1 })).toBe(false);
    expect(deveRetomar({ ...base, duracaoMs: MINIMO_MS })).toBe(true);
  });

  it('sem conversa pra continuar, não continua', () => {
    expect(deveRetomar({ ...base, falas: 0 })).toBe(false);
    expect(deveRetomar({ ...base, falas: 1 })).toBe(false);
    expect(deveRetomar({ ...base, falas: 2 })).toBe(true);
  });

  it('o teto existe pra um agente quebrado não virar um laço infinito', () => {
    expect(deveRetomar({ ...base, jaRetomou: MAX_RETOMADAS - 1 })).toBe(true);
    expect(deveRetomar({ ...base, jaRetomou: MAX_RETOMADAS })).toBe(false);
    expect(deveRetomar({ ...base, jaRetomou: 99 })).toBe(false);
  });

  it('motivo desconhecido não reabre — só o que a gente sabe interpretar', () => {
    expect(deveRetomar({ ...base, motivo: 'desconhecido' })).toBe(false);
    expect(deveRetomar({ ...base, motivo: undefined })).toBe(false);
  });
});

describe('a conversa por voz grava DURANTE, não só no fim', () => {
  it('existe uma função de gravar que cria e depois atualiza', () => {
    expect(FONTE).toContain('const persistir = useCallback');
    expect(FONTE).toMatch(/if \(idDaConversa\.current\)/);
    expect(FONTE).toContain("method: 'PATCH'");
    expect(FONTE).toContain("fetch('/api/conversations'");
  });

  it('cada fala nova dispara a gravação', () => {
    // Sem este gatilho a gravação volta a depender do fim da conversa, que é
    // exatamente o que estava quebrado.
    expect(FONTE).toMatch(/\[transcript\.length, persistir\]/);
  });

  it('fechar a aba no meio não perde o trecho', () => {
    expect(FONTE).toContain("addEventListener('pagehide'");
    expect(FONTE).toContain("visibilitychange");
    // keepalive é o que faz a requisição sobreviver ao fechamento da aba.
    expect(FONTE).toContain('keepalive');
  });

  it('um save recusado deixa rastro em vez de sumir', () => {
    // Antes a resposta era descartada: 401, 402 e 503 sumiam iguais.
    expect(FONTE).toContain('conversa_nao_salvou');
    expect(FONTE).toMatch(/avisarQueNaoSalvou\(r\.status\)/);
  });

  it('a duração só é escrita no fecho, nunca zerada a cada turno', () => {
    // Durante a conversa o PATCH não manda duration_seconds; se a rota
    // escrevesse 0 por omissão, meia hora de conversa viraria 0 segundo — e é
    // essa coluna que alimenta o streak.
    expect(ROTA).toContain('Number.isFinite(body.duration_seconds)');
    expect(ROTA).toMatch(/patch\.duration_seconds/);
  });
});

describe('a amplitude da voz não re-renderiza a tela', () => {
  it('o nível virou ref — nada de setState por quadro', () => {
    /* Com a boca morta, o setState por quadro repetia zero e o React o
       descartava — não custava nada e não fazia nada. Consertada a closure (ver
       o bloco do vivoRef), cada quadro passaria a ser um render de verdade,
       arrastando junto a transcrição, que cresce a conversa toda. O ref é o que
       impede o conserto de um bug de virar o outro. */
    expect(FONTE).not.toContain('setNivel');
    expect(FONTE).toContain('const nivelRef = useRef(0)');
    expect(FONTE).toContain('nivelRef.current = suave');
    expect(FONTE).toContain('nivelRef={nivelRef}');
  });

  it('o CadyLive lê o ref dentro do próprio loop', () => {
    expect(CADY).toContain('nivelRef = null');
    expect(CADY).toContain('vivo.current.ref');
    // A prop `nivel` continua valendo pra quem não tem áudio (o chat escrito).
    expect(CADY).toContain('nivel = 0');
  });
});

describe('o bloco de lição diz, explicitamente, que não há lição', () => {
  /* O system prompt do agente tem uma seção de lição guiada que termina em
     "then END THE CALL". Em conversa aberta as variáveis `unit_*` não eram
     enviadas e caíam no default do painel — vazio —, deixando "Lesson:  —
     focus:  — context:" logo abaixo dessa instrução. Pra um modelo pequeno
     isso não é "não há lição": é uma lição sem nome. */
  it('todas as variáveis vão sempre, com NONE quando não há lição', () => {
    for (const v of ['unit_title', 'unit_focus', 'unit_context', 'unit_drill']) {
      expect(FONTE, `${v} tem que ser sempre enviada`).toMatch(new RegExp(`${v}:`));
    }
    expect(FONTE).toContain("lessonUnit ? lessonUnit.title : 'NONE'");
    expect(FONTE).toContain('OPEN CONVERSATION');
    expect(FONTE).toMatch(/never end the call yourself/i);
  });

  it('nenhuma variável dinâmica é enviada condicionalmente', () => {
    // O spread condicional era o defeito: variável ausente vira o default do
    // painel, que é conteúdo que este código não controla nem enxerga.
    const bloco = FONTE.slice(FONTE.indexOf('dynamicVariables: {'), FONTE.indexOf('});', FONTE.indexOf('dynamicVariables: {')));
    expect(bloco).not.toContain('...(');
    for (const v of ['user_name', 'agent_name', 'prior_context', 'user_memory']) {
      expect(bloco).toContain(`${v}:`);
    }
  });

  it('o drill do card ainda pode encerrar — lá o fim é o produto', () => {
    expect(FONTE).toMatch(/isCard[\s\S]{0,200}end the call/i);
  });
});

describe('travou ou caiu: os dois casos agora deixam rastro', () => {
  it('a queda relata o motivo, e a parada relata o silêncio', () => {
    expect(FONTE).toContain("'voz_encerrada'");
    // O caso que não disparava nada: o agente emudece com o socket vivo.
    expect(FONTE).toContain("'voz_sem_resposta'");
    expect(FONTE).toContain('onUnhandledClientToolCall');
  });
});

describe('gravar cedo não pode custar o título', () => {
  /* O título sai da primeira fala do usuário com substância. No primeiro save a
     conversa quase sempre tem só a saudação da Cady — se ele fosse escrito uma
     vez e nunca mais, a lista inteira viraria "Conversa · 12 set". */
  it('o fecho reescreve o título, e a rota aceita isso', () => {
    expect(FONTE).toMatch(/fim && !unit && !isReview \? \{ title: deriveTitle\(messages\) \}/);
    expect(ROTA).toContain("typeof body.title === 'string'");
    expect(ROTA).toMatch(/patch\.title/);
  });

  it('lição e revisão mantêm o título fixo delas', () => {
    expect(FONTE).toContain('!unit && !isReview ? { title:');
  });
});

describe('duas gravações não correm soltas', () => {
  it('o fecho espera o save em voo antes de escrever duração e título', () => {
    // Um PATCH que saiu antes (menos falas, sem duração) aterrissando DEPOIS do
    // fecho apagaria a duração — e é ela que alimenta o streak.
    expect(FONTE).toContain('await emVoo.current');
    expect(FONTE).toMatch(/emVoo\.current = new Promise/);
    // E a lista de falas é relida depois da espera, senão o fecho grava uma
    // versão antiga da conversa.
    expect(FONTE).toMatch(/await emVoo\.current[\s\S]{0,400}const messages = messagesRef\.current;/);
  });
});

describe('nada que sobrevive ao render pode ler o retrato do render', () => {
  /* `useConversation` devolve um objeto NOVO a cada render, e `isSpeaking` /
     `isMuted` são VALORES dentro dele. Uma closure de rAF/timeout congela o
     valor do render em que nasceu. Foi assim que a boca da Cady ficou parada a
     conversa inteira: o loop nascia com `isSpeaking` false e nunca via outro. */
  it('o loop da boca lê o estado vivo, e por isso chama getOutputVolume', () => {
    const i = FONTE.indexOf('const passo = ()');
    const loop = FONTE.slice(i, i + 900);
    expect(loop, 'ler isSpeaking da closure congela a boca em zero').not.toContain('conversation.isSpeaking');
    expect(loop).toContain('vivoRef.current.falando');
    expect(loop).toContain('ler()');
  });

  it('o ref é reatribuído em todo render', () => {
    expect(FONTE).toMatch(/vivoRef\.current\.falando = conversation\.isSpeaking/);
    expect(FONTE).toMatch(/vivoRef\.current\.mudo = conversation\.isMuted/);
  });
});

describe('sair da tela sem fechar a aba também grava', () => {
  it('o desmonte chama o fecho', () => {
    // O SDK remove os listeners ANTES de encerrar a sessão: sem isto, trocar
    // pra "Escrever" ou abrir uma conversa salva jogava a conversa fora.
    expect(FONTE).toMatch(/useEffect\(\(\) => \(\) => \{ persistirRef\.current\(\{ fim: true, aoSair: true \}\); \}, \[\]\)/);
  });
});

describe('uma sessão órfã nunca vira duas conversas cobradas', () => {
  it('antes de abrir, fecha o que não estiver desconectado', () => {
    // `status` vira 'error' em qualquer onError do SDK — inclusive nos que não
    // derrubam a sessão. A tela volta pro repouso com a conversa viva embaixo.
    expect(FONTE).toMatch(/vivoRef\.current\.status !== 'disconnected'/);
    expect(FONTE).toMatch(/await conversation\.endSession\(\)/);
  });
});

describe('lista vazia e lista que não carregou não podem ser o mesmo pixel', () => {
  const VIEW = readFileSync('components/v2/ConversarView.js', 'utf8');
  it('uma busca recusada é dita, com como tentar de novo', () => {
    expect(VIEW).toContain('erroHistorico');
    expect(VIEW).toMatch(/if \(!res\.ok\) \{ setErroHistorico\(true\); return; \}/);
    expect(VIEW).toMatch(/não quer dizer que/);
    expect(VIEW).toContain('Tentar de novo');
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/* A MEMÓRIA DE UMA SESSÃO DE VOZ NÃO VOLTA, E A ÚNICA CURA É RECARREGAR.

   Medido em WebKit (mesmo motor do iPhone), dirigindo as classes reais do SDK:
   ~29 MB por sessão ficam no processo depois do `close()`. Não é referência
   nossa pendurada — o motor não devolve o AudioWorkletGlobalScope quando o
   AudioContext fecha, e o custo é proporcional ao TAMANHO do módulo carregado
   nele (um módulo vazio do mesmo tamanho vaza igual). Quarenta ciclos levaram o
   processo de 108 MB a 504 MB, linear, sem patamar.

   Estes testes seguram as três coisas que, se alguém "simplificar", trazem o
   problema de volta sem aviso: o contador viver fora do componente, a recarga
   só acontecer com a conversa encerrada, e a espera pelas gravações. */

const FONTE = readFileSync('components/v2/ConversationClient.js', 'utf8');

describe('o teto de sessões por página', () => {
  it('o contador vive FORA do componente', () => {
    /* Trocar pra "Escrever" e voltar desmonta e remonta a tela — e não devolve
       um byte do que o motor reteve. Um contador em useRef zeraria no remonte e
       o teto deixaria de existir exatamente para quem mais usa o produto. */
    const i = FONTE.indexOf('let sessoesNesteDocumento = 0;');
    expect(i).toBeGreaterThan(-1);
    const iComponente = FONTE.indexOf('function ConversationInner');
    expect(i, 'o contador está dentro do componente — ele vai zerar no remonte').toBeLessThan(iComponente);
  });

  it('conta toda sessão aberta, automática ou não', () => {
    const i = FONTE.indexOf('onConnect: () => {');
    expect(FONTE.slice(i, i + 500)).toContain('sessoesNesteDocumento += 1;');
  });

  it('a recarga só é marcada no ENCERRAMENTO, nunca no meio', () => {
    // Recarregar durante a conversa seria pior que o problema que ela resolve.
    const iRecarga = FONTE.indexOf('if (sessoesNesteDocumento >= MAX_SESSOES_POR_PAGINA)');
    const iDisc = FONTE.indexOf('onDisconnect: (detalhes) => {');
    const iMsg = FONTE.indexOf('onMessage: (msg) => {');
    expect(iRecarga).toBeGreaterThan(iDisc);
    expect(iRecarga, 'a recarga vazou pra fora do onDisconnect').toBeLessThan(iMsg);
  });

  it('espera as gravações aterrissarem antes de recarregar', () => {
    /* Recarregar por cima de um save em voo perderia o último trecho da
       conversa — justamente o que a gravação turno a turno existe pra salvar. */
    expect(FONTE).toContain('const ESPERA_RECARGA_MS = 3000;');
    expect(FONTE).toMatch(/setTimeout\(\(\) => \{[\s\S]{0,300}window\.location\.reload\(\);\s*\}, ESPERA_RECARGA_MS\)/);
  });

  it('começar a falar cancela a recarga marcada', () => {
    /* Em dois lugares: ao tocar (start) e ao conectar. Sem isso, a tela pode
       recarregar 3s depois de a pessoa já ter recomeçado a conversar.

       As fatias eram por número fixo de caracteres (400 e 500) e quebraram
       quando um comentário entrou no começo do `start` — falha por um motivo
       que não tem relação nenhuma com o que o teste afirma. Agora contam
       LINHAS de código, que é a unidade em que a distância importa. */
    const linhasApos = (marca, n) => {
      const i = FONTE.indexOf(marca);
      expect(i, `não achei "${marca}"`).toBeGreaterThan(-1);
      return FONTE.slice(i).split('\n').slice(0, n).join('\n');
    };
    expect(linhasApos('const start = useCallback(async (opcoes)', 14))
      .toContain('clearTimeout(recargaAgendada.current)');
    expect(linhasApos('onConnect: () => {', 14))
      .toContain('clearTimeout(recargaAgendada.current)');
  });

  it('deixa registro de que recarregou, e por quê', () => {
    expect(FONTE).toContain("'voz_recarga_memoria'");
  });

  it('o teto é conservador o bastante pra quase ninguém ver', () => {
    const m = FONTE.match(/const MAX_SESSOES_POR_PAGINA = (\d+);/);
    expect(m).toBeTruthy();
    const n = Number(m[1]);
    expect(n).toBeGreaterThanOrEqual(3);   // menos que isso atrapalha quem testa
    expect(n * 29, 'MB acumulados no pior caso').toBeLessThan(200);
  });
});

describe('a tela de reconectar não gira pra sempre', () => {
  const TELA = readFileSync('app/reconectando/page.js', 'utf8');
  /* O middleware serve esta tela por rewrite quando não consegue confirmar a
     sessão, e ela se recarrega de 2 em 2 segundos. Sem teto, uma sessão que de
     fato morreu prende a pessoa num pião girando — sem saída na tela e, como a
     URL é reescrita, sem nem saber onde está. */
  it('conta as tentativas e desiste', () => {
    expect(TELA).toContain('cadence.reconectando');
    expect(TELA).toMatch(/if\(n>6\)/);
  });

  it('e oferece a porta quando desiste', () => {
    expect(TELA).toContain('Entrar de novo');
    expect(TELA).toContain('href="/login"');
    // Remove o próprio meta refresh: senão continua recarregando por baixo.
    expect(TELA).toContain("getElementById('tentar-de-novo')");
  });

  it('sem JavaScript, continua tentando — melhor que uma tela morta', () => {
    expect(TELA).toContain('httpEquiv="refresh"');
  });
});

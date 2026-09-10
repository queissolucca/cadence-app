import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/* O fundo do Cadence roda 60x por segundo na mesma thread que processa os
   toques, então ele foi reescrito pra fazer menos por quadro (grade espacial no
   lugar do laço de todos-contra-todos, um traço por faixa de opacidade no lugar
   de um por linha, e a medida da tela lida fora do quadro).

   Duas coisas desse tipo de otimização quebram CALADAS — não derrubam build,
   não lançam erro, só deixam a tela sutilmente errada ou o app lento de novo:

   1. A vizinhança da grade. Uma célula de fora e há linhas que somem num canto;
      uma repetida e há linhas desenhadas duas vezes (visível: a opacidade soma).
   2. Leitura de layout dentro do quadro. `offsetWidth`/`getBoundingClientRect`
      forçam o navegador a recalcular layout na hora. Uma leitura dessas
      reintroduzida por descuido devolve o problema inteiro sem sinal nenhum.

   Estes testes fixam as duas. */

// ---------------------------------------------------------------------------
// Ambiente de navegador de mentira, o mínimo que o módulo toca.
// ---------------------------------------------------------------------------

let leiturasDeLayout = 0;
let chamadasStroke = 0;
let chamadasFill = 0;
let quadros = 0;

class Path2DFake {
  moveTo() {} lineTo() {} arc() {}
}

function canvasFake(w = 390, h = 844) {
  const ctx = {
    setTransform() {}, clearRect() {},
    stroke() { chamadasStroke++; }, fill() { chamadasFill++; },
    beginPath() {}, moveTo() {}, lineTo() {}, arc() {},
    strokeStyle: '', fillStyle: '', lineWidth: 1,
  };
  return {
    width: 0, height: 0,
    get offsetWidth() { leiturasDeLayout++; return w; },
    get offsetHeight() { leiturasDeLayout++; return h; },
    getBoundingClientRect() { leiturasDeLayout++; return { left: 0, top: 0, width: w, height: h }; },
    getContext: () => ctx,
    parentElement: { addEventListener() {}, removeEventListener() {} },
    addEventListener() {}, removeEventListener() {},
  };
}

const alvoFake = { addEventListener() {}, removeEventListener() {} };

function prepararAmbiente(quadrosDesejados) {
  leiturasDeLayout = 0; chamadasStroke = 0; chamadasFill = 0; quadros = 0;
  globalThis.devicePixelRatio = 3;
  globalThis.Path2D = Path2DFake;
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  globalThis.requestAnimationFrame = (fn) => { if (++quadros < quadrosDesejados) fn(); return quadros; };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
}

describe('vizinhança da grade espacial', () => {
  it('visita cada par de células vizinhas exatamente uma vez, e nenhuma de fora', async () => {
    const { VIZINHAS } = await import('../lib/constelacao.js');
    const cols = 6, rows = 5;

    // Roda o mesmo percurso do laço de desenho, contando cada par de células.
    const vistos = new Map();
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        for (const [vx, vy] of VIZINHAS) {
          const nx = cx + vx, ny = cy + vy;
          if (nx < 0 || nx >= cols || ny >= rows) continue;
          // par não-ordenado: (a,b) e (b,a) são o MESMO par de células
          const a = cy * cols + cx, b = ny * cols + nx;
          const chave = a <= b ? `${a}-${b}` : `${b}-${a}`;
          vistos.set(chave, (vistos.get(chave) || 0) + 1);
        }
      }
    }

    // Nenhum par contado duas vezes → nenhuma linha desenhada em dobro.
    const repetidos = [...vistos.entries()].filter(([, n]) => n > 1);
    expect(repetidos, `pares visitados mais de uma vez: ${JSON.stringify(repetidos)}`).toEqual([]);

    // E a cobertura: todo par de células que PODE ter uma linha (a mesma célula,
    // ou duas que se tocam, inclusive na diagonal) precisa estar na lista. Sem
    // isto, linhas somem em silêncio numa das diagonais.
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
            const a = cy * cols + cx, b = ny * cols + nx;
            const chave = a <= b ? `${a}-${b}` : `${b}-${a}`;
            expect(vistos.has(chave), `par de células ${chave} (${dx},${dy}) nunca visitado`).toBe(true);
          }
        }
      }
    }
  });

  it('a lista é metade da vizinhança de 8 + a própria célula', async () => {
    const { VIZINHAS } = await import('../lib/constelacao.js');
    expect(VIZINHAS).toHaveLength(5);
    // Só deslocamentos de -1..1: a grade tem célula do tamanho do alcance da
    // linha, então dois pontos a duas células de distância NUNCA se ligam.
    for (const [dx, dy] of VIZINHAS) {
      expect(Math.abs(dx)).toBeLessThanOrEqual(1);
      expect(Math.abs(dy)).toBeLessThanOrEqual(1);
    }
  });
});

describe('custo por quadro', () => {
  const guardados = {};
  beforeEach(() => {
    for (const k of ['devicePixelRatio', 'Path2D', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame']) {
      guardados[k] = globalThis[k];
    }
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(guardados)) globalThis[k] = v;
  });

  it('não lê layout dentro do quadro', async () => {
    prepararAmbiente(60);
    const { montarConstelacao } = await import('../lib/constelacao.js');
    montarConstelacao(canvasFake(), { alvoPonteiro: alvoFake });

    expect(quadros).toBeGreaterThan(50);   // rodou mesmo
    /* Uma medida na montagem, e mais nenhuma. A versão anterior lia
       offsetWidth/offsetHeight duas vezes POR QUADRO — 120 recálculos de layout
       forçados em 60 quadros. */
    expect(leiturasDeLayout).toBe(1);
  });

  it('desenha em faixas: um punhado de traços por quadro, não um por linha', async () => {
    prepararAmbiente(60);
    const { montarConstelacao } = await import('../lib/constelacao.js');
    montarConstelacao(canvasFake(), { alvoPonteiro: alvoFake });

    /* 8 faixas de linha + 5 de ponto + 1 de "tocado" = teto de 14 por quadro,
       e sem ponteiro em cima o toque não desenha nada. Com uma chamada por
       linha isto passava de mil em 60 quadros. */
    expect(chamadasStroke / quadros).toBeLessThanOrEqual(8);
    expect(chamadasFill / quadros).toBeLessThanOrEqual(6);
  });

  it('limita o buffer a 2x, mesmo em tela 3x', async () => {
    prepararAmbiente(2);
    const { montarConstelacao } = await import('../lib/constelacao.js');
    const cv = canvasFake(390, 844);
    montarConstelacao(cv, { alvoPonteiro: alvoFake });

    // 3x custaria 2.25x mais pixels pra pintar sem diferença visível numa malha
    // de linhas de 0.8px.
    expect(cv.width).toBe(390 * 2);
    expect(cv.height).toBe(844 * 2);
  });

  it('para de vez quando o sistema pede menos movimento', async () => {
    prepararAmbiente(60);
    globalThis.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    const { montarConstelacao } = await import('../lib/constelacao.js');
    montarConstelacao(canvasFake(), { alvoPonteiro: alvoFake });

    // Um quadro só (a malha fica parada, pintada uma vez).
    expect(quadros).toBe(0);
    expect(chamadasStroke).toBeGreaterThan(0);
  });
});

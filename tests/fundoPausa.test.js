import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { montarConstelacao, EVENTO_FUNDO } from '../lib/constelacao.js';

/* O FUNDO CEDE A TELA PRA CONVERSA.

   O sintoma que motivou isto foi o Safari do iOS mostrando "esta página web foi
   recarregada devido a um problema" depois de alguns turnos de voz — ou seja, o
   WebKit MATANDO a aba. A aba morre por memória TOTAL do processo, e um canvas
   de tela cheia repintando a 60 quadros por segundo atrás de uma conversa é
   custo puro: ninguém olha pro fundo enquanto fala com a Cady.

   O que estes testes seguram é a parte que não é óbvia: parar de DESENHAR não
   devolve memória nenhuma. O que devolve é largar o backing store — e é isso que
   pode ser esquecido numa refatoração futura, porque a tela fica igual dos dois
   jeitos. */

class Path2DFake { moveTo() {} lineTo() {} arc() {} }

function canvasFake(caixa) {
  const ctx = {
    setTransform() {}, clearRect() {}, stroke() {}, fill() {},
    beginPath() {}, moveTo() {}, lineTo() {}, arc() {},
    strokeStyle: '', fillStyle: '', lineWidth: 1,
  };
  return {
    width: 0, height: 0,
    getBoundingClientRect: () => ({ ...caixa }),
    getContext: () => ctx,
    addEventListener() {}, removeEventListener() {},
  };
}

let ouvintes;
let quadrosPedidos;

beforeEach(() => {
  ouvintes = new Map();
  quadrosPedidos = 0;
  globalThis.devicePixelRatio = 3;   // iPhone
  globalThis.Path2D = Path2DFake;
  globalThis.performance = globalThis.performance || { now: () => 0 };
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  // Um quadro só por pedido: o suficiente pra ver se o loop continua vivo.
  globalThis.requestAnimationFrame = () => { quadrosPedidos += 1; return quadrosPedidos; };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.addEventListener = (nome, fn) => { ouvintes.set(nome, fn); };
  globalThis.removeEventListener = (nome) => { ouvintes.delete(nome); };
});

afterEach(() => { vi.useRealTimers(); });

const CAIXA = { width: 390, height: 844, left: 0, top: 0 };
const disparar = (pausada) => ouvintes.get(EVENTO_FUNDO)({ detail: { pausada } });

describe('o fundo vivo sai do ar durante a conversa', () => {
  it('pausado, DEVOLVE a superfície — não só para de desenhar', () => {
    const cv = canvasFake(CAIXA);
    montarConstelacao(cv, { alvoPonteiro: { addEventListener() {}, removeEventListener() {} } });
    // Montado: a superfície existe, em tamanho de tela cheia.
    expect(cv.width).toBeGreaterThan(700);
    expect(cv.height).toBeGreaterThan(1600);
    const pixeisAntes = cv.width * cv.height;

    disparar(true);

    // É ISTO que devolve memória. Um canvas de 390x844 com DPR 2 são ~1,3 milhão
    // de pixels — uns 5MB de backing store, mais a camada composta.
    expect(cv.width * cv.height).toBe(1);
    expect(pixeisAntes / (cv.width * cv.height)).toBeGreaterThan(1_000_000);
  });

  /* O resize é o caminho que ressuscitaria o fundo sem ninguém pedir — e ele
     dispara sozinho, em rajada, só de rolar a página no celular (a barra de
     endereço recolhendo). Ele é debounced em 150ms, então o teste precisa
     ADIANTAR O RELÓGIO; sem isso o resize não chega a fazer nada e o teste
     passa mesmo com o bug dentro. */
  it('resize durante a pausa não ressuscita o fundo', () => {
    vi.useFakeTimers();
    const cv = canvasFake(CAIXA);
    montarConstelacao(cv, { alvoPonteiro: { addEventListener() {}, removeEventListener() {} } });
    disparar(true);
    const antes = quadrosPedidos;

    ouvintes.get('resize')();
    vi.advanceTimersByTime(400);

    expect(cv.width * cv.height, 'a superfície voltou sozinha').toBe(1);
    expect(quadrosPedidos, 'o loop voltou sozinho').toBe(antes);
  });

  it('ao acabar a conversa, o fundo volta inteiro', () => {
    const cv = canvasFake(CAIXA);
    montarConstelacao(cv, { alvoPonteiro: { addEventListener() {}, removeEventListener() {} } });
    disparar(true);
    disparar(false);
    expect(cv.width).toBeGreaterThan(700);
    expect(cv.height).toBeGreaterThan(1600);
  });

  it('pausar duas vezes não desfaz a pausa, e despausar sem pausa não quebra', () => {
    const cv = canvasFake(CAIXA);
    montarConstelacao(cv, { alvoPonteiro: { addEventListener() {}, removeEventListener() {} } });
    disparar(true);
    disparar(true);
    expect(cv.width * cv.height).toBe(1);
    disparar(false);
    disparar(false);
    expect(cv.width).toBeGreaterThan(700);
  });

  it('a limpeza tira o ouvinte do evento', () => {
    const cv = canvasFake(CAIXA);
    const desmontar = montarConstelacao(cv, { alvoPonteiro: { addEventListener() {}, removeEventListener() {} } });
    expect(ouvintes.has(EVENTO_FUNDO)).toBe(true);
    desmontar();
    expect(ouvintes.has(EVENTO_FUNDO)).toBe(false);
  });
});

describe('quem manda o sinal é a conversa', () => {
  const FONTE = readFileSync('components/v2/ConversationClient.js', 'utf8');
  it('pausa enquanto a sessão existe e devolve ao sair', () => {
    expect(FONTE).toContain('pausarFundo(true)');
    expect(FONTE).toContain('return () => pausarFundo(false)');
    // Preso à SESSÃO, não à saúde dela: com status 'error' o fundo também fica
    // pausado, e volta quando a sessão realmente acaba.
    expect(FONTE).toMatch(/if \(!sessaoViva\) return undefined;\s*\n\s*pausarFundo\(true\);/);
  });
});

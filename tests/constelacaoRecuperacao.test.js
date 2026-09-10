import { describe, it, expect } from 'vitest';

/* A medida da tela saiu de dentro do quadro (era um recálculo de layout forçado
   a cada 16ms). Tirar a medida de lá cria dois jeitos de a medida em cache
   ficar velha, e os dois têm sintoma silencioso:

   1. Canvas que monta com tamanho ZERO — pai escondido, ou layout que ainda não
      resolveu. A versão que media por quadro se curava sozinha no quadro
      seguinte; uma que mede só na montagem ficaria com um fundo em branco pra
      sempre.
   2. Rolagem. O canvas anda na tela sem disparar resize, e a origem em cache é
      o que converte a posição do dedo. Velha, a malha é puxada no lugar errado.

   Estes testes fixam a recuperação nos dois casos. */

class Path2DFake { moveTo() {} lineTo() {} arc() {} }

function ambiente(quadrosDesejados) {
  const est = { quadros: 0 };
  globalThis.devicePixelRatio = 2;
  globalThis.Path2D = Path2DFake;
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  globalThis.requestAnimationFrame = (fn) => { if (++est.quadros < quadrosDesejados) fn(); return est.quadros; };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  return est;
}

// Canvas cujo tamanho e posição a gente controla de fora.
function canvasFake(caixa) {
  const ctx = {
    setTransform() {}, clearRect() {}, stroke() {}, fill() {},
    beginPath() {}, moveTo() {}, lineTo() {}, arc() {},
    strokeStyle: '', fillStyle: '', lineWidth: 1,
  };
  return {
    width: 0, height: 0,
    leituras: 0,
    get offsetWidth() { this.leituras++; return caixa.width; },
    get offsetHeight() { this.leituras++; return caixa.height; },
    getBoundingClientRect() { this.leituras++; return { ...caixa }; },
    getContext: () => ctx,
    parentElement: { addEventListener() {}, removeEventListener() {} },
    addEventListener() {}, removeEventListener() {},
  };
}

const alvoFake = { addEventListener() {}, removeEventListener() {} };

describe('recuperação da medida em cache', () => {
  it('se monta com tamanho zero, volta a medir até conseguir', async () => {
    const est = ambiente(5);
    const { montarConstelacao } = await import('../lib/constelacao.js');
    // Nasce escondido (pai com display:none, por exemplo).
    const caixa = { left: 0, top: 0, width: 0, height: 0 };
    const cv = canvasFake(caixa);
    montarConstelacao(cv, { alvoPonteiro: alvoFake });

    // Sem tamanho, o buffer não foi dimensionado — mas o laço continua vivo.
    expect(cv.width).toBe(0);
    expect(est.quadros).toBeGreaterThan(0);

    // Aparece. O quadro seguinte tem que dimensionar sozinho, sem resize.
    caixa.width = 390; caixa.height = 844;
    const est2 = ambiente(3);
    globalThis.requestAnimationFrame = (fn) => { if (++est2.quadros < 3) fn(); return est2.quadros; };
    const cv2 = canvasFake(caixa);
    montarConstelacao(cv2, { alvoPonteiro: alvoFake });
    expect(cv2.width).toBe(390 * 2);
  });

  it('rolar não mede por evento — mede uma vez no quadro seguinte', async () => {
    let aoRolar = null;
    const est = ambiente(3);
    globalThis.addEventListener = (tipo, fn) => { if (tipo === 'scroll') aoRolar = fn; };

    const { montarConstelacao } = await import('../lib/constelacao.js');
    const caixa = { left: 0, top: 0, width: 390, height: 844 };
    const cv = canvasFake(caixa);
    montarConstelacao(cv, { alvoPonteiro: alvoFake });

    expect(aoRolar, 'precisa escutar scroll pra origem não ficar velha').toBeTypeOf('function');

    const antes = cv.leituras;
    // Uma rajada de scroll, como o navegador manda de verdade.
    for (let i = 0; i < 50; i++) aoRolar();
    expect(cv.leituras, 'scroll não pode medir por evento').toBe(antes);
  });
});

'use client';

/* A malha de fundo do Cadence: pontos que respiram, se ligam por proximidade e
   são puxados pelo ponteiro.

   Isto era o corpo do components/comecar/Constellation.js. Virou módulo porque
   o /v2 passou a usar o mesmo fundo, e manter duas cópias da física daria dois
   fundos que divergem em silêncio — o mesmo problema que os rótulos de memória
   tinham antes do lib/memoryCategories.js.

   A puxada é MOLA, não arrasto. Cada ponto tem uma "casa" que segue à deriva e
   um deslocamento que a mola leva na direção do ponteiro e traz de volta.
   Arrastar a casa direto faria a malha inteira grudar no cursor e nunca mais
   voltar ao lugar — que é o bug clássico desse efeito. */

const LINK = 118;      // alcance da linha entre dois pontos
const PULL_R = 138;    // alcance da puxada
const PULL = 30;       // deslocamento máximo, px
const STIFF = 0.055, DAMP = 0.86;

// Verde da marca e o mint que marca o que o ponteiro está tocando.
export const CORES_ESCURAS = { linha: '62,155,95', ponto: '62,155,95', toque: '143,240,192', alpha: 1 };

/* Monta a malha num canvas. Devolve a função de limpeza.

   `cores` é função e não objeto porque o /v2 troca de tema em tempo de
   execução (next-themes põe/tira a classe `dark` no <html>): lida a cada
   quadro, a malha acompanha o tema sem remontar nada.

   `alvoPonteiro` existe porque o canvas é sempre pointer-events:none — senão
   engoliria os cliques dos botões — e portanto nunca recebe evento por conta
   própria. No /comecar quem escuta é o #phone; num fundo fixo na viewport,
   quem escuta é a window. */
export function montarConstelacao(cv, { cores = () => CORES_ESCURAS, alvoPonteiro } = {}) {
  const cx = cv.getContext('2d');
  const parado = matchMedia('(prefers-reduced-motion:reduce)').matches;

  let pts = [];
  let raf = 0;
  const ptr = { x: 0, y: 0, on: false, down: false };

  function init() {
    const w = cv.offsetWidth, h = cv.offsetHeight;
    if (!w || !h) return;
    cv.width = w * devicePixelRatio;
    cv.height = h * devicePixelRatio;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.scale(devicePixelRatio, devicePixelRatio);
    // teto de 110 porque o laço de pares é O(n²) por quadro
    const n = Math.max(30, Math.min(110, Math.round(w * h / 4600)));
    pts = Array.from({ length: n }, () => {
      const ang = Math.random() * Math.PI * 2, sp = 0.05 + Math.random() * 0.13;
      return {
        hx: Math.random() * w, hy: Math.random() * h,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        ox: 0, oy: 0, ovx: 0, ovy: 0, x: 0, y: 0,
        r: Math.random() * 1.4 + 0.9, ph: Math.random() * Math.PI * 2,
      };
    });
  }

  function frame() {
    const w = cv.offsetWidth, h = cv.offsetHeight, t = performance.now();
    const c = cores();
    cx.clearRect(0, 0, w, h);

    for (const p of pts) {
      p.hx += p.vx; p.hy += p.vy;
      if (p.hx < 0 || p.hx > w) { p.vx *= -1; p.hx = Math.max(0, Math.min(w, p.hx)); }
      if (p.hy < 0 || p.hy > h) { p.vy *= -1; p.hy = Math.max(0, Math.min(h, p.hy)); }

      let tx = 0, ty = 0;
      if (ptr.on && !parado) {
        const dx = ptr.x - p.hx, dy = ptr.y - p.hy, d = Math.hypot(dx, dy);
        if (d < PULL_R && d > 0.5) {
          const k = (1 - d / PULL_R) * (ptr.down ? 1.8 : 1);
          tx = dx / d * PULL * k;
          ty = dy / d * PULL * k;
        }
      }
      p.ovx = (p.ovx + (tx - p.ox) * STIFF) * DAMP;
      p.ovy = (p.ovy + (ty - p.oy) * STIFF) * DAMP;
      p.ox += p.ovx; p.oy += p.ovy;
      p.x = p.hx + p.ox; p.y = p.hy + p.oy;
    }

    cx.lineWidth = 0.8;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < LINK) {
          cx.strokeStyle = `rgba(${c.linha},${((1 - d / LINK) * 0.34 * c.alpha).toFixed(3)})`;
          cx.beginPath();
          cx.moveTo(pts[i].x, pts[i].y); cx.lineTo(pts[j].x, pts[j].y); cx.stroke();
        }
      }
    }

    // o ponteiro também é um nó: liga nele o que está por perto, mais claro
    // que o resto, pra a interação ficar visível e não só sentida
    if (ptr.on && !parado) {
      cx.lineWidth = 1;
      for (const p of pts) {
        const d = Math.hypot(ptr.x - p.x, ptr.y - p.y);
        if (d < PULL_R) {
          cx.strokeStyle = `rgba(${c.toque},${((1 - d / PULL_R) * 0.5 * c.alpha).toFixed(3)})`;
          cx.beginPath(); cx.moveTo(ptr.x, ptr.y); cx.lineTo(p.x, p.y); cx.stroke();
        }
      }
    }

    for (const p of pts) {
      // respiro individual, cada ponto na sua fase: junto, lê como malha viva;
      // em fase, leria como piscada da tela inteira
      const puxado = Math.hypot(p.ox, p.oy) / PULL;
      const r = p.r * (1 + (parado ? 0 : 0.22 * Math.sin(t / 900 + p.ph)) + puxado * 0.5);
      cx.fillStyle = `rgba(${puxado > 0.25 ? c.toque : c.ponto},${((0.5 + puxado * 0.45) * c.alpha).toFixed(3)})`;
      cx.beginPath(); cx.arc(p.x, p.y, Math.max(0.4, r), 0, 7); cx.fill();
    }

    if (!parado) raf = requestAnimationFrame(frame);
  }

  const alvo = alvoPonteiro || cv.parentElement || cv;
  const em = e => {
    const r = cv.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = true;
  };
  const desliga = () => { ptr.on = false; ptr.down = false; };
  const desce = e => { ptr.down = true; em(e); };
  const sobe = () => { ptr.down = false; };

  alvo.addEventListener('pointermove', em, { passive: true });
  alvo.addEventListener('pointerdown', desce, { passive: true });
  alvo.addEventListener('pointerup', sobe, { passive: true });
  alvo.addEventListener('pointerleave', desliga);
  alvo.addEventListener('pointercancel', desliga);

  const aoRedimensionar = () => init();
  addEventListener('resize', aoRedimensionar);

  init();
  frame();

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', aoRedimensionar);
    alvo.removeEventListener('pointermove', em);
    alvo.removeEventListener('pointerdown', desce);
    alvo.removeEventListener('pointerup', sobe);
    alvo.removeEventListener('pointerleave', desliga);
    alvo.removeEventListener('pointercancel', desliga);
  };
}

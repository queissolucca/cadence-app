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
   voltar ao lugar — que é o bug clássico desse efeito.

   ---------------------------------------------------------------------------
   POR QUE O DESENHO É ASSIM (e não do jeito óbvio)

   Este laço roda 60x por segundo na thread que também processa os toques. Cada
   milissegundo gasto aqui é milissegundo que o botão leva pra responder — foi
   por isso que a versão anterior deixava o app "grudento" no celular. Quatro
   coisas custavam caro, e todas as quatro têm o mesmo antídoto: fazer menos
   por quadro, não fazer mais rápido.

   1. LAYOUT POR QUADRO. `cv.offsetWidth` obriga o navegador a recalcular o
      layout na hora (é leitura síncrona de geometria). Lido duas vezes por
      quadro, dentro do rAF, é um recálculo de layout a cada 16ms. Agora a
      medida é tirada uma vez, na montagem e no resize, e guardada em `dim`.

   2. PARES O(n²). 110 pontos = 5.995 comparações por quadro pra achar as
      linhas — e quase todas dão em nada, porque só vizinhos de até 118px se
      ligam. Uma grade de células do tamanho do alcance transforma isso em
      "olhe só as células ao lado": ~10x menos comparações, e o resultado
      desenhado é idêntico.

   3. UM `stroke()` POR LINHA. Cada chamada de traço é um comando separado pro
      rasterizador. Com centenas de linhas por quadro isso domina o custo. As
      linhas agora vão pra um punhado de faixas de opacidade e cada faixa é UM
      traço só — de ~600 chamadas pra 8.

   4. STRINGS DE COR POR LINHA. `rgba(...)` + toFixed(3) criava duas strings
      por linha por quadro (milhares por segundo) só pra o coletor de lixo
      recolher depois — e coletor rodando é quadro perdido. As faixas de
      opacidade são calculadas uma vez por quadro, não por linha.

   O resultado é visualmente o mesmo fundo (as faixas de opacidade são finas o
   suficiente pra ninguém ver o degrau) com uma fração do custo. */

const LINK = 118;      // alcance da linha entre dois pontos
const LINK2 = LINK * LINK;
const PULL_R = 138;    // alcance da puxada
const PULL_R2 = PULL_R * PULL_R;
const PULL = 30;       // deslocamento máximo, px
const STIFF = 0.055, DAMP = 0.86;

/* Quantas faixas de opacidade. 8 é onde o degrau deixa de ser perceptível numa
   linha de 0.8px a no máximo 34% de opacidade — e é também o número de traços
   por quadro, então subir isso é subir o custo. */
const FAIXAS = 8;
const FAIXAS_PONTO = 5;

/* Retina acima de 2x não muda nada visível numa malha de linhas de 0.8px, mas
   3x custa 2.25x mais pixels pra pintar. Em celular topo de linha (dpr 3) esse
   teto sozinho devolve boa parte do quadro. */
const DPR_MAX = 2;

/* Metade da vizinhança da grade. Olhar as 8 células ao redor contaria cada par
   DUAS vezes, e par duplicado é linha desenhada duas vezes — o que se vê,
   porque a opacidade soma. Estas 5 (a própria + a da direita + a fileira de
   baixo) visitam cada par exatamente uma vez.

   Exportada porque essa é a única invariante do arquivo que um engano quebra
   sem quebrar nada visível de imediato: uma célula de fora deixa linhas somindo
   num canto da tela, uma repetida deixa linhas dobradas. O teste em
   tests/constelacao.test.js afirma as duas coisas. */
export const VIZINHAS = [[0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

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
/* CEDER A TELA PARA A CONVERSA.

   Este fundo é enfeite; a conversa de voz é o produto. Enquanto ela roda, o
   canvas fica repintando a viewport inteira a 60 quadros por segundo atrás de
   uma tela em que ninguém está olhando pro fundo — disputando thread principal
   e memória gráfica com a captura do microfone, o playback e o WebSocket.

   No iOS isso não é só lentidão: o Safari mata a aba por memória TOTAL do
   processo, e uma superfície de canvas em tela cheia conta. Pausado, o backing
   store também é DEVOLVIDO (o canvas encolhe pra 1x1), que é o que de fato
   libera a memória — parar de desenhar sozinho não devolveria nada.

   O sinal vem por evento de janela porque o fundo mora no layout e a conversa
   mora lá no fundo da árvore; ligar os dois por props obrigaria a atravessar o
   app inteiro com um estado que só interessa a estes dois arquivos. */
export const EVENTO_FUNDO = 'cadence:fundo';

export function pausarFundo(pausada) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(EVENTO_FUNDO, { detail: { pausada: !!pausada } }));
  } catch {
    /* nada aqui pode atrapalhar a conversa */
  }
}

export function montarConstelacao(cv, { cores = () => CORES_ESCURAS, alvoPonteiro } = {}) {
  const cx = cv.getContext('2d');
  const mqParado = matchMedia('(prefers-reduced-motion:reduce)');
  let parado = mqParado.matches;

  let pts = [];
  let raf = 0;
  const ptr = { x: 0, y: 0, on: false, down: false };

  /* Geometria em cache. Medir custa layout, então mede-se no resize e ponto —
     nunca dentro do quadro. `rect` é pra converter coordenada de ponteiro. */
  const dim = { w: 0, h: 0, esq: 0, topo: 0 };
  let rolou = false;

  // Grade espacial: células do tamanho do alcance da linha, refeita por quadro
  // (é um preenchimento linear, muito mais barato que o laço de pares).
  let cols = 0, rows = 0;
  let celulas = [];

  function medir() {
    const r = cv.getBoundingClientRect();
    dim.esq = r.left; dim.topo = r.top;
    return { w: Math.round(r.width), h: Math.round(r.height) };
  }

  function init() {
    const { w, h } = medir();
    if (!w || !h) return;
    dim.w = w; dim.h = h;

    const dpr = Math.min(devicePixelRatio || 1, DPR_MAX);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // teto de 110 mantido: é o que define a densidade visual da malha
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

    cols = Math.max(1, Math.ceil(w / LINK));
    rows = Math.max(1, Math.ceil(h / LINK));
    celulas = Array.from({ length: cols * rows }, () => []);
  }

  function frame() {
    /* Montagem com tamanho zero (pai escondido, layout ainda não resolvido) e a
       origem depois de rolar são os DOIS casos em que a medida em cache fica
       velha. A versão anterior não tinha esse problema porque media a cada
       quadro — e era justamente essa medida por quadro o custo que saiu daqui.

       Então a medida volta, mas só quando faz falta: sem tamanho, ou depois de
       um scroll de verdade. No caso comum (nem um nem outro), zero leitura de
       layout por quadro. */
    if (!dim.w || !dim.h) { init(); if (!dim.w || !dim.h) { raf = requestAnimationFrame(frame); return; } }
    if (rolou) { rolou = false; const r = cv.getBoundingClientRect(); dim.esq = r.left; dim.topo = r.top; }

    const w = dim.w, h = dim.h, t = performance.now();
    const c = cores();
    cx.clearRect(0, 0, w, h);

    // ---- física ----
    for (const p of pts) {
      p.hx += p.vx; p.hy += p.vy;
      if (p.hx < 0 || p.hx > w) { p.vx *= -1; p.hx = Math.max(0, Math.min(w, p.hx)); }
      if (p.hy < 0 || p.hy > h) { p.vy *= -1; p.hy = Math.max(0, Math.min(h, p.hy)); }

      let tx = 0, ty = 0;
      if (ptr.on && !parado) {
        const dx = ptr.x - p.hx, dy = ptr.y - p.hy, d2 = dx * dx + dy * dy;
        if (d2 < PULL_R2 && d2 > 0.25) {
          const d = Math.sqrt(d2);
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

    // ---- grade: cada ponto na sua célula ----
    for (let i = 0; i < celulas.length; i++) celulas[i].length = 0;
    for (const p of pts) {
      const cxi = Math.min(cols - 1, Math.max(0, (p.x / LINK) | 0));
      const cyi = Math.min(rows - 1, Math.max(0, (p.y / LINK) | 0));
      celulas[cyi * cols + cxi].push(p);
    }

    // ---- linhas entre pontos ----
    // Path2D não tem "limpar", então é um novo por faixa por quadro: 8 objetos
    // curtos por quadro, contra os milhares de strings de cor de antes.
    const linhas = Array.from({ length: FAIXAS }, () => new Path2D());
    for (let cyi = 0; cyi < rows; cyi++) {
      for (let cxi = 0; cxi < cols; cxi++) {
        const aqui = celulas[cyi * cols + cxi];
        if (!aqui.length) continue;
        for (const [vx, vy] of VIZINHAS) {
          const nx = cxi + vx, ny = cyi + vy;
          if (nx < 0 || nx >= cols || ny >= rows) continue;
          const propria = vx === 0 && vy === 0;
          const outra = propria ? aqui : celulas[ny * cols + nx];
          if (!outra.length) continue;
          for (let i = 0; i < aqui.length; i++) {
            // na própria célula, começa do vizinho seguinte pra não repetir par
            for (let j = propria ? i + 1 : 0; j < outra.length; j++) {
              const a = aqui[i], b = outra[j];
              const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
              if (d2 >= LINK2) continue;
              const prox = 1 - Math.sqrt(d2) / LINK;   // 0..1
              const path = linhas[Math.min(FAIXAS - 1, (prox * FAIXAS) | 0)];
              path.moveTo(a.x, a.y); path.lineTo(b.x, b.y);
            }
          }
        }
      }
    }

    cx.lineWidth = 0.8;
    for (let f = 0; f < FAIXAS; f++) {
      // opacidade no meio da faixa: o degrau fica abaixo do perceptível
      const prox = (f + 0.5) / FAIXAS;
      cx.strokeStyle = `rgba(${c.linha},${(prox * 0.34 * c.alpha).toFixed(3)})`;
      cx.stroke(linhas[f]);
    }

    // ---- o ponteiro também é um nó ----
    if (ptr.on && !parado) {
      const toques = Array.from({ length: FAIXAS }, () => new Path2D());
      let algum = false;
      for (const p of pts) {
        const dx = ptr.x - p.x, dy = ptr.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 >= PULL_R2) continue;
        const prox = 1 - Math.sqrt(d2) / PULL_R;
        const faixa = Math.min(FAIXAS - 1, (prox * FAIXAS) | 0);
        toques[faixa].moveTo(ptr.x, ptr.y); toques[faixa].lineTo(p.x, p.y);
        algum = true;
      }
      if (algum) {
        cx.lineWidth = 1;
        for (let f = 0; f < FAIXAS; f++) {
          const prox = (f + 0.5) / FAIXAS;
          cx.strokeStyle = `rgba(${c.toque},${(prox * 0.5 * c.alpha).toFixed(3)})`;
          cx.stroke(toques[f]);
        }
      }
    }

    // ---- os pontos ----
    /* Mesma ideia das linhas: em vez de um fillStyle + fill() por ponto, os
       pontos vão pra faixas por quanto estão puxados (que é o que muda cor e
       opacidade) e cada faixa é um fill() só. */
    const pontos = Array.from({ length: FAIXAS_PONTO }, () => new Path2D());
    const tocados = new Path2D();
    let temTocado = false;
    for (const p of pts) {
      // respiro individual, cada ponto na sua fase: junto, lê como malha viva;
      // em fase, leria como piscada da tela inteira
      const puxado = Math.min(1, Math.sqrt(p.ox * p.ox + p.oy * p.oy) / PULL);
      const r = p.r * (1 + (parado ? 0 : 0.22 * Math.sin(t / 900 + p.ph)) + puxado * 0.5);
      const raio = Math.max(0.4, r);
      if (puxado > 0.25) {
        tocados.moveTo(p.x + raio, p.y);
        tocados.arc(p.x, p.y, raio, 0, 7);
        temTocado = true;
      } else {
        const faixa = Math.min(FAIXAS_PONTO - 1, (puxado * 4 * FAIXAS_PONTO) | 0);
        pontos[faixa].moveTo(p.x + raio, p.y);
        pontos[faixa].arc(p.x, p.y, raio, 0, 7);
      }
    }
    for (let f = 0; f < FAIXAS_PONTO; f++) {
      const puxado = (f + 0.5) / (FAIXAS_PONTO * 4);
      cx.fillStyle = `rgba(${c.ponto},${((0.5 + puxado * 0.45) * c.alpha).toFixed(3)})`;
      cx.fill(pontos[f]);
    }
    if (temTocado) {
      cx.fillStyle = `rgba(${c.toque},${(0.72 * c.alpha).toFixed(3)})`;
      cx.fill(tocados);
    }

    if (!parado) raf = requestAnimationFrame(frame);
  }

  function tocar() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  const alvo = alvoPonteiro || cv.parentElement || cv;
  const em = e => {
    // Sem getBoundingClientRect aqui: num arraste isso seria um recálculo de
    // layout por evento de ponteiro, e o ponteiro dispara mais que o quadro.
    ptr.x = e.clientX - dim.esq; ptr.y = e.clientY - dim.topo; ptr.on = true;
  };
  const desliga = () => { ptr.on = false; ptr.down = false; };
  const desce = e => { ptr.down = true; em(e); };
  const sobe = () => { ptr.down = false; };

  alvo.addEventListener('pointermove', em, { passive: true });
  alvo.addEventListener('pointerdown', desce, { passive: true });
  alvo.addEventListener('pointerup', sobe, { passive: true });
  alvo.addEventListener('pointerleave', desliga);
  alvo.addEventListener('pointercancel', desliga);

  /* O resize antes remontava a malha a cada evento. No celular a barra de
     endereço que recolhe dispara resize em rajada durante a rolagem, então
     rolar a página resorteava 110 pontos várias vezes por segundo. Agora
     espera a rajada acabar e só refaz se a medida mudou de verdade. */
  let pausada = false;
  let tResize = 0;
  const aoRedimensionar = () => {
    if (pausada) return;
    clearTimeout(tResize);
    tResize = setTimeout(() => {
      const { w, h } = medir();
      if (w === dim.w && h === dim.h) return;   // só a barra do navegador
      init();
      if (parado) frame();
    }, 150);
  };
  /* Rolar move o canvas na tela sem disparar resize: a origem em cache precisa
     acompanhar, ou a puxada do ponteiro fica deslocada. Mas scroll dispara mais
     vezes que o quadro, então aqui só levanta a bandeira — quem mede é o quadro
     seguinte, uma vez. */
  const aoRolar = () => { rolou = true; };

  addEventListener('resize', aoRedimensionar);
  addEventListener('scroll', aoRolar, { passive: true });

  const aoPausar = (e) => {
    const querPausar = !!(e && e.detail && e.detail.pausada);
    if (querPausar === pausada) return;
    pausada = querPausar;
    if (pausada) {
      cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(tResize);
      // 1x1 e não 0: alguns navegadores rejeitam canvas de dimensão zero. O que
      // importa é que a superfície de tela cheia deixa de existir.
      cv.width = 1; cv.height = 1;
      dim.w = 0; dim.h = 0;   // força um init() de verdade ao voltar
      return;
    }
    init();
    frame();
  };
  addEventListener(EVENTO_FUNDO, aoPausar);

  // Quem liga "menos movimento" no meio da sessão para a malha na hora, sem
  // recarregar a página.
  const aoTrocarMovimento = () => {
    parado = mqParado.matches;
    if (parado) { cancelAnimationFrame(raf); raf = 0; frame(); } else tocar();
  };
  mqParado.addEventListener?.('change', aoTrocarMovimento);

  init();
  frame();

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(tResize);
    removeEventListener(EVENTO_FUNDO, aoPausar);
    removeEventListener('resize', aoRedimensionar);
    removeEventListener('scroll', aoRolar);
    mqParado.removeEventListener?.('change', aoTrocarMovimento);
    alvo.removeEventListener('pointermove', em);
    alvo.removeEventListener('pointerdown', desce);
    alvo.removeEventListener('pointerup', sobe);
    alvo.removeEventListener('pointerleave', desliga);
    alvo.removeEventListener('pointercancel', desliga);
  };
}

/* Cady viva: a mesma esfera de cady.js, com as camadas de rosto empilhadas
   e a logica de toque. Um unico SVG, sem framework. */
import * as C from "./cady.js";

const { Q, CX, CY, R, E_R } = C;
const R0 = R * 1.10;
const f1 = n => n.toFixed(1);

export const RAY_ORIGIN_Y = CY - R0;          // 74.8 no tamanho de referencia
export const HIT_R = R * 1.04;                // raio de acerto do "toque nela"
export const HOLD_MS = 260;                   // quando segurar vira "encarando"
export const PUPIL_MAX = 0.34;                // fracao do raio do olho
export const TILT_MAX = 5;                    // graus
export const MURMUR_GAP = [5200, 12000];      // pausa entre murmurios, ms
export const MURMUR_STEP = [110, 190];        // duracao de cada silaba, ms

function amps(n = 72, seed = 7) {
  // aleatorio estavel, para a coroa nao ficar mecanica
  let s = seed, out = [];
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    out.push(+(0.38 + 0.62 * Math.pow(s / 4294967296, 1.15)).toFixed(3));
  }
  return out;
}

function crown(P, n = 72, A = null) {
  A = A || amps(n);
  let out = "";
  for (let i = 0; i < n; i++) {
    const ang = (-90 + i * 360 / n).toFixed(2);
    out += `<g transform="rotate(${ang} ${CX} ${CY})">` +
      `<line class="cady-ray" x1="${CX}" y1="${f1(CY - R0)}" x2="${CX}" ` +
      `y2="${f1(CY - R0 - R * 0.16)}" style="--a:${A[i]};--i:${(i * 0.021).toFixed(3)}s"/></g>`;
  }
  return `<g class="cady-crown">${out}</g>`;
}

function eyeTrack(P, k) {
  let out = "";
  for (const s of [-1, 1]) {
    const r = E_R * R * k, [x, y] = C.eyePos(s), max = (r * PUPIL_MAX).toFixed(2);
    out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#FFFFFF"/>` +
      `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="none" stroke="${P.ink}" ` +
      `stroke-width="${f1(r * 0.20)}"/>` +
      `<circle class="cady-pupil" cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.46)}" ` +
      `fill="${P.ink}" data-max="${max}"/>` +
      `<circle class="cady-pupil" cx="${f1(x - r * 0.16)}" cy="${f1(y - r * 0.18)}" ` +
      `r="${f1(r * 0.13)}" fill="#FFFFFF" data-max="${max}" opacity="0.9"/>`;
  }
  return out;
}

/* Estado -> camada de olho + camada de boca + extra.
   Os nomes batem com as expressoes de cady.js. */
export const STATE_LAYERS = {
  idle:    ["eye-dot", "m-smile"],
  touched: ["eye-arc", "m-small", "ex-hearts"],
  curious: ["eye-track", "m-o", "ex-dots"],
  staring: ["eye-track-big", "m-open", "ex-sparks"],
  talking: ["eye-dot", "m-talk"],
  happy:   ["eye-sparkle", "m-smirk"],

  // --- estados da conversa ao vivo ---
  // ouvindo: pupila que acompanha, boca pequena. É a cara de atenção.
  ouvindo:  ["eye-track", "m-small"],
  // mudo: ela sabe que o microfone está fechado — olho de traço, boca reta.
  mudo:     ["eye-dash", "m-line"],
  // corrigindo: a cara da imagem 2. Sobrancelha inclinada, dentes cerrados,
  // vapor e as marcas de raiva. O avermelhado é a camada .cady-heat, no CSS.
  corrigindo: ["eye-dot", "brows", "m-grit", "ex-steam", "ex-anger"],
  // corrigindo enquanto fala: mesma cara, boca que abre e fecha
  corrigindo_falando: ["eye-dot", "brows", "m-open", "ex-steam", "ex-anger"],
  // elogiando: o oposto, pra quando ela aprova
  elogiando: ["eye-sparkle", "m-open", "ex-sparks"],
  // pensando: enquanto a resposta escrita não chega. Boca fechada e as
  // reticências saindo da coroa — é espera, não fala.
  pensando: ["eye-track", "m-line", "ex-dots"],
};

export function cadyLiveSVG(opts = {}) {
  const { palette = "rosa-quartzo", uid = "live", background = true } = opts;
  const P = typeof palette === "string" ? C.PALETTES[palette] : palette;
  const layers = [
    ["eye-dot", C.eDot(P, -1) + C.eDot(P, 1)],
    ["eye-arc", C.eArc(P, -1) + C.eArc(P, 1)],
    ["eye-sparkle", C.eSparkle(P, -1) + C.eSparkle(P, 1, -1)],
    ["eye-track", eyeTrack(P, 1.12)],
    ["eye-track-big", eyeTrack(P, 1.36)],
    ["eye-dash", C.eDash(P, -1) + C.eDash(P, 1)],
    ["brows", C.brows(P)],
    ["m-smile", C.mSmile(P, uid)],
    ["m-small", C.mSmall(P, uid)],
    ["m-o", C.mO(P, uid, 1.15)],
    ["m-talk", C.mTalk(P)],
    ["m-open", C.mOpen(P, uid, true, 1.08)],
    ["m-wave", C.mWave(P)],
    ["m-smirk", C.mSmirk(P)],
    ["m-line", C.mLine(P)],
    ["m-grit", C.mGrit(P)],
    ["ex-hearts", C.exHearts(P)],
    ["ex-sparks", C.exSparks(P)],
    ["ex-dots", C.exDots(P)],
    ["ex-steam", C.exSteam(P)],
    ["ex-anger", C.exAnger(P)],
    ["ex-sweat", C.exSweat(P)],
  ].map(([n, m]) => `<g class="cady-ly" data-ly="${n}">${m}</g>`).join("");

  return `<svg class="cady" viewBox="0 0 ${Q} ${Q}" data-state="idle" ` +
    `style="--cady-ray:${P.ray}" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${opts.label || "Cady"}">` +
    C.defs(P, uid) +
    (background ? `<rect width="${Q}" height="${Q}" fill="${P.bg}"/>` : "") +
    `<ellipse class="cady-halo" cx="${CX}" cy="${CY}" rx="${(R * 1.62).toFixed(0)}" ` +
    `ry="${(R * 1.58).toFixed(0)}" fill="url(#glow${uid})"/>` +
    `<ellipse cx="${CX}" cy="${(CY + R * 1.22).toFixed(0)}" rx="${(R * 0.86).toFixed(0)}" ` +
    `ry="${(R * 0.20).toFixed(0)}" fill="url(#drop${uid})"/>` +
    crown(P) +
    `<g class="cady-tilt"><g class="cady-core">` + C.volume(P, uid) +
    // Esquenta por cima do corpo em vez de trocar a paleta: os gradientes vivem
    // nos <defs>, então trocar de paleta obrigaria a remontar o SVG inteiro e
    // cortaria toda animação em curso. Aqui é só opacidade, com transição.
    `<circle class="cady-heat" cx="${CX}" cy="${CY}" r="${R}" fill="url(#heat${uid})"/>` +
    `<g class="cady-blush">` + C.blush(P) + `</g>` + layers +
    `</g></g></svg>`;
}

export const CADY_CSS = `
.cady{display:block;width:100%;height:auto;-webkit-tap-highlight-color:transparent;
 will-change:transform}
.cady-ly{display:none}
.cady-pupil{transition:transform .10s linear}
.cady-blush ellipse{opacity:.62;transition:opacity .25s}
.cady-tilt{transform-origin:${CX}px ${CY}px;transition:transform .22s ease-out}
.cady-core{transform-origin:${CX}px ${CY}px;animation:cady-bod 4.6s ease-in-out infinite}
.cady-ray{stroke:var(--cady-ray);stroke-width:${(R * 0.018).toFixed(1)};stroke-linecap:round;
 transform-origin:${CX}px ${RAY_ORIGIN_Y.toFixed(1)}px;transform:scaleY(var(--a));
 opacity:calc(.50 + .45*var(--a));animation:cady-calm 3.4s ease-in-out infinite;
 animation-delay:var(--i)}
.cady-halo{animation:cady-gl 4.6s ease-in-out infinite}
@keyframes cady-bod{0%,100%{transform:scale(1)}50%{transform:scale(1.013)}}
@keyframes cady-gl{0%,100%{opacity:.86}50%{opacity:1}}
@keyframes cady-calm{0%,100%{transform:scaleY(calc(var(--a)*.72))}
 50%{transform:scaleY(calc(var(--a)*1.02))}}
@keyframes cady-level{0%,100%{transform:scaleY(calc(var(--a)*.55))}
 50%{transform:scaleY(calc(var(--a)*1.5))}}
@keyframes cady-burst{0%{transform:scaleY(calc(var(--a)*.6))}
 40%{transform:scaleY(calc(var(--a)*1.85))}100%{transform:scaleY(calc(var(--a)*1.15))}}
@keyframes cady-squish{0%{transform:scale(1)}34%{transform:scale(1.055,.945)}
 70%{transform:scale(.975,1.025)}100%{transform:scale(1)}}
.cady[data-state="staring"] .cady-ray{animation:cady-level .62s ease-in-out infinite;
 animation-delay:var(--i)}
.cady[data-state="touched"] .cady-ray{animation:cady-burst .75s ease-out both}
.cady[data-state="touched"] .cady-core{animation:cady-squish .52s cubic-bezier(.34,1.56,.64,1)}
.cady[data-state="touched"] .cady-blush ellipse{opacity:.95}
.cady[data-state="staring"] .cady-blush ellipse{opacity:.78}
/* Cady parada (cadySVG, sem JS) murmura por CSS: a boca abre e fecha em tres
 tempos e depois fica quieta o resto do ciclo. O transform-origin e o centro da
 boca (CY + M_DY*R), senao ela escorrega pro meio da cara ao escalar. */
.cady-mouth{transform-origin:${CX}px ${(CY + 0.215*R).toFixed(1)}px;
 animation:cady-murmur 7.2s ease-in-out infinite}
@keyframes cady-murmur{
 0%,68%,100%{transform:scaleY(1)}
 72%{transform:scaleY(1.55)} 76%{transform:scaleY(.88)}
 80%{transform:scaleY(1.42)} 84%{transform:scaleY(.92)}
 88%{transform:scaleY(1.24)} 92%{transform:scaleY(1)}}
/* Avermelhado das caras bravas: desligado por padrão, entra com transição.
   O tremor é curto de propósito — em loop longo vira desenho animado. */
.cady-heat{opacity:0;transition:opacity .45s ease}
.cady[data-state="corrigindo"] .cady-heat,
.cady[data-state="corrigindo_falando"] .cady-heat{opacity:.72}
.cady[data-state="corrigindo"] .cady-core,
.cady[data-state="corrigindo_falando"] .cady-core{animation:cady-tremor .42s ease-in-out 2}
/* A coroa esquenta junto: no SVG vivo ela lê --cady-ray. O !important não é
   preguiça — o cadyLiveSVG grava --cady-ray como estilo INLINE no <svg>, e
   declaração de folha só vence estilo inline sendo important. */
.cady[data-state="corrigindo"],
.cady[data-state="corrigindo_falando"]{--cady-ray:#FFA24E!important}
.cady[data-state="corrigindo"] .cady-blush ellipse,
.cady[data-state="corrigindo_falando"] .cady-blush ellipse{opacity:.9}
@keyframes cady-tremor{0%,100%{transform:translateX(0)}
 25%{transform:translateX(-1.6%)}75%{transform:translateX(1.6%)}}
.cady-steam{transform-origin:${CX}px ${CY}px;animation:cady-steam 2.1s ease-in-out infinite;
 animation-delay:var(--i)}
@keyframes cady-steam{0%{opacity:0;transform:translateY(4%) scale(.9)}
 40%{opacity:1}100%{opacity:0;transform:translateY(-6%) scale(1.12)}}
/* A boca segue a voz: o React grava --mouth (0..1) e a escala sai daí, então o
   movimento é a amplitude real do áudio e não um loop cronometrado. */
.cady[data-live="1"] .cady-ly[data-ly^="m-"]{transform-origin:${CX}px ${(CY + 0.215*R).toFixed(1)}px;
 transform:scaleY(calc(.80 + .55*var(--mouth,0)));transition:transform .07s linear}
.cady[data-live="1"] .cady-mouth{animation:none}
@media (prefers-reduced-motion:reduce){
 .cady-core,.cady-ray,.cady-halo,.cady-tilt,.cady-mouth,.cady-steam{animation:none!important;
  transition:none!important}}
`;

/* Monta a Cady dentro de um elemento e liga a interacao.
   Devolve { svg, setState, destroy }. */
export function mountCady(host, opts = {}) {
  const { palette = "rosa-quartzo", uid = "live", onState = null,
          interactive = true, background = true, label } = opts;
  host.innerHTML = cadyLiveSVG({ palette, uid, background, label });
  const svg = host.querySelector(".cady");
  const tilt = svg.querySelector(".cady-tilt");
  const pupils = svg.querySelectorAll(".cady-pupil");
  const lys = svg.querySelectorAll(".cady-ly");
  const EY = CY + C.E_DY * R;

  let state = "", holdT = null, backT = null, down = false;
  let murmurT = null, dead = false;

  function setState(s) {
    if (s === state) return;
    state = s; svg.dataset.state = s;
    const on = STATE_LAYERS[s] || STATE_LAYERS.idle;
    lys.forEach(g => { g.style.display = on.includes(g.dataset.ly) ? "block" : "none"; });
    if (onState) onState(s);
  }

  // Murmurio: parada, ela mexe a boca de vez em quando. Sinal de vida, nao
  // animacao — a cada 5-12s uma rajada de 3 a 5 "silabas" e volta pro sorriso.
  // Troca so a camada de boca (setState continua mandando no resto), e qualquer
  // estado que nao seja idle interrompe no meio.
  const rand = ([a, b]) => a + Math.random() * (b - a);
  const still = matchMedia("(prefers-reduced-motion:reduce)").matches;

  function mouth(name) {
    lys.forEach(g => {
      if (!g.dataset.ly.startsWith("m-")) return;
      g.style.display = g.dataset.ly === name ? "block" : "none";
    });
  }

  function murmur(left) {
    if (dead) return;
    // Sair do idle no meio da rajada nao pode voltar pro sorriso na forca:
    // setState ja escolheu a boca do estado novo, e sobrescrever aqui apagaria
    // ela. Nesse caso o murmurio so desiste e reagenda.
    if (state !== "idle") { schedule(); return; }
    if (left <= 0) { mouth("m-smile"); schedule(); return; }
    mouth(["m-talk", "m-o", "m-small"][left % 3]);
    murmurT = setTimeout(() => murmur(left - 1), rand(MURMUR_STEP));
  }

  function schedule() {
    if (dead || still) return;
    clearTimeout(murmurT);
    murmurT = setTimeout(() => murmur(3 + Math.floor(Math.random() * 3)), rand(MURMUR_GAP));
  }
  function look(p) {
    const vx = p.x - CX, vy = p.y - EY;
    const d = Math.hypot(vx, vy) || 1, soft = Math.min(1, d / (R * 1.6));
    pupils.forEach(el => {
      const m = parseFloat(el.dataset.max) * soft;
      el.setAttribute("transform",
        `translate(${(vx / d * m).toFixed(2)},${(vy / d * m).toFixed(2)})`);
    });
    tilt.style.transform =
      `rotate(${Math.max(-TILT_MAX, Math.min(TILT_MAX, vx / R * TILT_MAX)).toFixed(2)}deg)`;
  }
  function center() {
    pupils.forEach(el => el.setAttribute("transform", "translate(0,0)"));
    tilt.style.transform = "";
  }
  function toLocal(e) {
    const r = host.getBoundingClientRect(), k = Q / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  }
  const inside = p => (p.x - CX) ** 2 + (p.y - CY) ** 2 <= HIT_R ** 2;

  function onDown(e) {
    host.setPointerCapture?.(e.pointerId);
    down = true; clearTimeout(backT); clearTimeout(holdT);
    const p = toLocal(e);
    if (inside(p)) { center(); setState("touched"); }
    else {
      look(p); setState("curious");
      holdT = setTimeout(() => { if (down) { look(p); setState("staring"); } }, HOLD_MS);
    }
  }
  function onMove(e) {
    if (!down) return;
    if (state === "curious" || state === "staring") look(toLocal(e));
  }
  function onUp() {
    down = false; clearTimeout(holdT);
    const wait = state === "touched" ? 520 : 340;
    backT = setTimeout(() => { center(); setState("idle"); schedule(); }, wait);
  }

  if (interactive) {
    host.style.touchAction = "manipulation";
    host.style.cursor = "pointer";
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    host.addEventListener("pointerleave", () => { if (down) onUp(); });
  }
  setState("idle");
  schedule();

  return {
    svg, setState,
    destroy() {
      dead = true;
      clearTimeout(holdT); clearTimeout(backT); clearTimeout(murmurT);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.innerHTML = "";
    }
  };
}

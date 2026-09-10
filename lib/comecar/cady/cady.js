/* Cady, gerador oficial. Porte fiel da geometria de referencia.
   Uma esfera de 440x440, centro 220,220, raio 132. Tudo o que muda entre
   expressoes e o olho, a boca e no maximo um extra fora da cabeca. */

export const Q = 440, CX = 220, CY = 220, R = 132;

// feicoes, sempre em fracao de R
export const E_R = 0.132, E_DX = 0.250, E_DY = -0.075;      // olho
export const M_RX = 0.050, M_RY = 0.058, M_DY = 0.215;      // boca
export const B_DX = 0.385, B_DY = 0.115, B_RX = 0.092, B_RY = 0.056; // bochecha
export const ARC_W = 0.215, ARC_TH = 0.055;                 // olho fechado
export const TEAR = "#DDF2FF", TONGUE = "#F2758F";

export const PALETTES = {
  "rosa-quartzo": { hi:"#FFE0EA", mid:"#F58DAE", lo:"#A63E68", core:"#EE7DA1",
    ray:"#8FF0C0", glow:"#EC7099", ink:"#1B0A12", blush:"#D9527A",
    bg:"#170D12", shadow:"#0C0509" },
  "verde": { hi:"#9FF0C4", mid:"#39B26E", lo:"#166B42", core:"#2E9E5B",
    ray:"#7FE0AB", glow:"#2E9E5B", ink:"#08150E", blush:"#1B6E48",
    bg:"#0B1410", shadow:"#040906" },
  "iridescente": { hi:"#C6F7DC", mid:"#5FCFAE", lo:"#6B57C9", core:"#5FBFB4",
    ray:"#C9B6FF", glow:"#8E6DE8", ink:"#100A1E", blush:"#F49BC4",
    bg:"#0D0A16", shadow:"#06040C" },
  "claro-rosa": { hi:"#C8F7DC", mid:"#5CC98A", lo:"#2A8A58", core:"#48BB79",
    ray:"#DA5F88", glow:"#48BB79", ink:"#0F1A14", blush:"#F2789B",
    bg:"#F6F9F4", shadow:"#B9CFC0" },
};

const f1 = n => n.toFixed(1), f2 = n => n.toFixed(2);
const op = o => (o === undefined || o === null) ? "" : ` opacity="${o}"`;

export const circ = (cx, cy, r, fill, o) =>
  `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${fill}"${op(o)}/>`;

export const ell = (cx, cy, rx, ry, fill, o) =>
  `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${fill}"${op(o)}/>`;

export const st = (d, color, w, o, cap = "round") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f2(w)}" ` +
  `stroke-linecap="${cap}" stroke-linejoin="round"${op(o)}/>`;

export const star = (cx, cy, w, h, fill, k = 0.20) =>
  `<path d="M ${f1(cx)} ${f1(cy-h)} Q ${f1(cx+w*k)} ${f1(cy-h*k)} ${f1(cx+w)} ${f1(cy)} ` +
  `Q ${f1(cx+w*k)} ${f1(cy+h*k)} ${f1(cx)} ${f1(cy+h)} ` +
  `Q ${f1(cx-w*k)} ${f1(cy+h*k)} ${f1(cx-w)} ${f1(cy)} ` +
  `Q ${f1(cx-w*k)} ${f1(cy-h*k)} ${f1(cx)} ${f1(cy-h)} Z" fill="${fill}"/>`;

export const heart = (cx, cy, w, h, fill) =>
  `<path d="M ${f1(cx)} ${f1(cy+h*0.62)} ` +
  `C ${f1(cx-w*1.15)} ${f1(cy-h*0.18)} ${f1(cx-w*0.42)} ${f1(cy-h*0.98)} ${f1(cx)} ${f1(cy-h*0.22)} ` +
  `C ${f1(cx+w*0.42)} ${f1(cy-h*0.98)} ${f1(cx+w*1.15)} ${f1(cy-h*0.18)} ${f1(cx)} ${f1(cy+h*0.62)} Z" ` +
  `fill="${fill}"/>`;

export const drop = (cx, cy, w, h, fill, o) =>
  `<path d="M ${f1(cx)} ${f1(cy-h)} Q ${f1(cx+w)} ${f1(cy+h*0.18)} ${f1(cx)} ${f1(cy+h)} ` +
  `Q ${f1(cx-w)} ${f1(cy+h*0.18)} ${f1(cx)} ${f1(cy-h)} Z" fill="${fill}"${op(o)}/>`;

// ------------------------------------------------------------------ gradientes
export function defs(P, uid) {
  return `<defs>
<radialGradient id="body${uid}" cx="0.36" cy="0.28" r="0.82">
 <stop offset="0" stop-color="${P.hi}"/>
 <stop offset="0.42" stop-color="${P.mid}"/>
 <stop offset="1" stop-color="${P.lo}"/></radialGradient>
<radialGradient id="glow${uid}" cx="0.5" cy="0.5" r="0.5">
 <stop offset="0.40" stop-color="${P.glow}" stop-opacity="0.42"/>
 <stop offset="0.66" stop-color="${P.glow}" stop-opacity="0.16"/>
 <stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient>
<radialGradient id="spec${uid}" cx="0.5" cy="0.5" r="0.5">
 <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
 <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.14"/>
 <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
<radialGradient id="occ${uid}" cx="0.5" cy="0.5" r="0.5">
 <stop offset="0.30" stop-color="${P.lo}" stop-opacity="0.85"/>
 <stop offset="0.72" stop-color="${P.lo}" stop-opacity="0.30"/>
 <stop offset="1" stop-color="${P.lo}" stop-opacity="0"/></radialGradient>
<radialGradient id="rim${uid}" cx="0.5" cy="0.5" r="0.5">
 <stop offset="0.55" stop-color="${P.hi}" stop-opacity="0.0"/>
 <stop offset="0.86" stop-color="${P.hi}" stop-opacity="0.55"/>
 <stop offset="1" stop-color="${P.hi}" stop-opacity="0"/></radialGradient>
<radialGradient id="drop${uid}" cx="0.5" cy="0.5" r="0.5">
 <stop offset="0" stop-color="${P.shadow}" stop-opacity="0.60"/>
 <stop offset="0.62" stop-color="${P.shadow}" stop-opacity="0.22"/>
 <stop offset="1" stop-color="${P.shadow}" stop-opacity="0"/></radialGradient>
<clipPath id="clip${uid}"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>
</defs>`;
}

// ------------------------------------------------------------------ coroa
export function rays(P, n = 72, amps = null) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const a = Math.PI/180 * (-90 + i*360/n);
    const amp = amps ? amps[i % amps.length] : (0.55 + 0.45*((i*7) % 5)/4);
    const r0 = R*1.10, r1 = r0 + R*0.16*amp;
    const x0 = CX + r0*Math.cos(a), y0 = CY + r0*Math.sin(a);
    const x1 = CX + r1*Math.cos(a), y1 = CY + r1*Math.sin(a);
    out += st(`M ${f1(x0)} ${f1(y0)} L ${f1(x1)} ${f1(y1)}`, P.ray, R*0.018,
              Number((0.50 + 0.45*amp).toFixed(2)));
  }
  return `<g class="rays">${out}</g>`;
}

// ------------------------------------------------------------------ volume
export function volume(P, uid) {
  return `<g class="body">` +
    circ(CX, CY, R, `url(#body${uid})`) +
    `<g clip-path="url(#clip${uid})">` +
      ell(CX + R*0.30, CY + R*0.52, R*1.05, R*0.95, `url(#occ${uid})`) +
      ell(CX, CY, R*1.02, R*1.02, `url(#rim${uid})`) +
      ell(CX - R*0.34, CY - R*0.40, R*0.52, R*0.40, `url(#spec${uid})`) +
      ell(CX - R*0.20, CY - R*0.58, R*0.20, R*0.11, "#FFFFFF", 0.30) +
    `</g></g>`;
}

export const eyePos = s => [CX + s*E_DX*R, CY + E_DY*R];

// ------------------------------------------------------------------ olhos
export function eDot(P, s, k = 1.0) {
  const r = E_R*R*k, [x, y] = eyePos(s);
  return circ(x, y, r, P.ink) + circ(x - r*0.30, y - r*0.32, r*0.28, "#FFFFFF", 0.85);
}
export const eBig = (P, s) => eDot(P, s, 1.28);

export function eArc(P, s) {
  const w = ARC_W*R, th = ARC_TH*R, [x, y] = eyePos(s);
  return st(`M ${f1(x-w/2)} ${f1(y+w*0.26)} Q ${f1(x)} ${f1(y-w*0.30)} ` +
            `${f1(x+w/2)} ${f1(y+w*0.26)}`, P.ink, th);
}
export function eDroop(P, s) {
  const w = ARC_W*R, th = ARC_TH*R, [x, y] = eyePos(s);
  return st(`M ${f1(x-w/2)} ${f1(y-w*0.10)} Q ${f1(x)} ${f1(y+w*0.34)} ` +
            `${f1(x+w/2)} ${f1(y-w*0.10)}`, P.ink, th);
}
export function eSad(P, s) {
  const w = ARC_W*R, th = ARC_TH*R, [x, y] = eyePos(s);
  const d = `M ${f1(x-w/2)} ${f1(y-w*0.10)} Q ${f1(x)} ${f1(y+w*0.30)} ` +
            `${f1(x+w/2)} ${f1(y-w*0.10)}`;
  return `<g transform="rotate(${s*13} ${f1(x)} ${f1(y)})">${st(d, P.ink, th)}</g>`;
}
export function eDash(P, s) {
  const w = ARC_W*R*0.9, th = ARC_TH*R*0.85, [x, y] = eyePos(s);
  return st(`M ${f1(x-w/2)} ${f1(y)} L ${f1(x+w/2)} ${f1(y)}`, P.ink, th);
}
export function ePupil(P, s, look = [0, 0], k = 1.12) {
  const r = E_R*R*k, [x, y] = eyePos(s);
  return circ(x, y, r, "#FFFFFF") +
    `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="none" ` +
    `stroke="${P.ink}" stroke-width="${f1(r*0.20)}"/>` +
    circ(x + look[0]*r*0.30, y + look[1]*r*0.30, r*0.46, P.ink);
}
export function eSparkle(P, s, flip = 1) {
  const r = E_R*R, [x, y] = eyePos(s);
  return circ(x, y, r, P.ink) +
    star(x - r*0.26*flip, y - r*0.22, r*0.40, r*0.56, "#FFFFFF") +
    star(x + r*0.34*flip, y + r*0.18, r*0.22, r*0.31, "#FFFFFF");
}
export function eHeart(P, s) {
  const r = E_R*R, [x, y] = eyePos(s);
  return heart(x, y, r*1.20, r*1.28, P.ink) +
    circ(x - r*0.42, y - r*0.20, r*0.22, "#FFFFFF", 0.9);
}

// ------------------------------------------------------------------ bocas
export function mSmile(P, uid, k = 3.0) {
  const w = M_RX*R*k, y = CY + M_DY*R;
  return st(`M ${f1(CX-w/2)} ${f1(y-1)} Q ${f1(CX)} ${f1(y+w*0.40)} ${f1(CX+w/2)} ${f1(y-1)}`,
            P.ink, M_RY*R*0.66);
}
export const mSmall = (P, uid) => mSmile(P, uid, 2.1);
export function mLine(P) {
  const w = M_RX*R*1.9, y = CY + M_DY*R;
  return st(`M ${f1(CX-w)} ${f1(y)} L ${f1(CX+w)} ${f1(y)}`, P.ink, M_RY*R*0.66);
}
export const mO = (P, uid, k = 1.0) => ell(CX, CY + M_DY*R, M_RX*R*k, M_RY*R*k, P.ink);
export const mBigO = P => ell(CX, CY + M_DY*R, M_RX*R*1.40, M_RY*R*1.95, P.ink);
export const mTalk = P => ell(CX, CY + M_DY*R, M_RX*R*1.15, M_RY*R*1.55, P.ink);

export function mOpen(P, uid = "", tongue = false, k = 1.0) {
  const w = M_RX*R*2.45*k, y = CY + M_DY*R - M_RY*R*0.30;
  const d = `M ${f1(CX-w)} ${f1(y)} A ${f1(w)} ${f1(w)} 0 0 0 ${f1(CX+w)} ${f1(y)} Z`;
  let out = `<path d="${d}" fill="${P.ink}"/>`;
  if (tongue) {
    out = `<defs><clipPath id="mo${uid}"><path d="${d}"/></clipPath></defs>` + out +
      `<g clip-path="url(#mo${uid})">` +
      ell(CX, y + w*0.72, w*0.60, w*0.46, TONGUE) + `</g>`;
  }
  return out;
}
export function mWave(P) {
  const w = M_RX*R*3.1, y = CY + M_DY*R, a = M_RY*R*1.05, x0 = CX - w/2;
  return st(`M ${f1(x0)} ${f1(y)} Q ${f1(x0+w*0.17)} ${f1(y-a)} ${f1(x0+w*0.34)} ${f1(y)} ` +
            `Q ${f1(x0+w*0.50)} ${f1(y+a)} ${f1(x0+w*0.66)} ${f1(y)} ` +
            `Q ${f1(x0+w*0.83)} ${f1(y-a)} ${f1(x0+w)} ${f1(y)}`, P.ink, M_RY*R*0.64);
}
export function mFrown(P) {
  const w = M_RX*R*3.0, y = CY + M_DY*R + M_RY*R*0.9;
  return st(`M ${f1(CX-w/2)} ${f1(y)} Q ${f1(CX)} ${f1(y-w*0.48)} ${f1(CX+w/2)} ${f1(y)}`,
            P.ink, M_RY*R*0.66);
}
export function mSmirk(P) {
  const w = M_RX*R*2.8, y = CY + M_DY*R;
  return st(`M ${f1(CX-w*0.42)} ${f1(y+w*0.06)} Q ${f1(CX+w*0.06)} ${f1(y+w*0.30)} ` +
            `${f1(CX+w*0.48)} ${f1(y-w*0.14)}`, P.ink, M_RY*R*0.62);
}

// ------------------------------------------------------------------ bochecha
export const blush = (P, o = 0.62) =>
  [-1, 1].map(s => ell(CX + s*B_DX*R, CY + B_DY*R, B_RX*R, B_RY*R, P.blush, o)).join("");

// ------------------------------------------------------------------ extras
export function exSparks(P) {
  const pts = [[-1.06,-0.92,0.075],[1.02,-0.98,0.055],[1.14,0.30,0.062],
               [-1.18,0.18,0.048],[0.06,-1.30,0.050]];
  return pts.map(([dx,dy,s]) => star(CX+dx*R, CY+dy*R, s*R, s*R*1.4, P.ray)).join("");
}
export function exDots(P) {
  const cfg = [[1.34,0.044],[1.56,0.058],[1.80,0.074]];
  return cfg.map(([d,rr],i) => {
    const a = Math.PI/180*(-52 + i*7);
    return circ(CX + d*R*Math.cos(a), CY + d*R*Math.sin(a), rr*R, P.ray, 0.60 + 0.13*i);
  }).join("");
}
export function exZzz(P) {
  const cfg = [[0.78,-1.24,0.150],[1.12,-0.98,0.112],[1.38,-0.74,0.082]];
  return cfg.map(([dx,dy,s],i) => {
    const x = CX+dx*R, y = CY+dy*R, w = s*R;
    return st(`M ${f1(x)} ${f1(y)} L ${f1(x+w)} ${f1(y)} L ${f1(x)} ${f1(y+w)} ` +
              `L ${f1(x+w)} ${f1(y+w)}`, P.ray, w*0.22, 0.75 - 0.12*i);
  }).join("");
}
export function exTear(P) {
  const [x, y] = eyePos(-1), r = E_R*R;
  return drop(x - r*0.18, y + r*2.60, r*0.60, r*0.95, TEAR, 0.94);
}
export const exSweat = P => drop(CX + R*0.60, CY - R*0.62, R*0.070, R*0.115, TEAR, 0.90);
export function exHearts(P) {
  const cfg = [[1.10,-0.86,0.095],[1.36,-0.52,0.066],[-1.18,-0.92,0.076]];
  return cfg.map(([dx,dy,s]) => heart(CX+dx*R, CY+dy*R, s*R, s*R*1.1, TONGUE)).join("");
}

// ------------------------------------------------------------------ expressoes
const both = (fn, ...rest) => P => fn(P, -1, ...rest) + fn(P, 1, ...rest);

export const EXPRESSIONS = {
  "repouso":     { eyes: both(eDot),  mouth: mSmile, blush: 0.62 },
  "falando":     { eyes: both(eDot),  mouth: mTalk,  blush: 0.62 },
  "ouvindo":     { eyes: both(eBig),  mouth: mO,     blush: 0.62 },
  "acertou":     { eyes: both(eArc),  mouth: (P,u) => mOpen(P,u), extra: exSparks, blush: 0.70 },
  "rindo":       { eyes: both(eArc),  mouth: (P,u) => mOpen(P,u,true,1.15), blush: 0.70 },
  "quase":       { eyes: P => ePupil(P,-1,[0.8,0.2]) + ePupil(P,1,[0.8,0.2]),
                   mouth: mWave, blush: 0.62 },
  "pensando":    { eyes: P => ePupil(P,-1,[0.3,-0.9]) + ePupil(P,1,[0.3,-0.9]),
                   mouth: mLine, extra: exDots, blush: 0.55 },
  "curiosa":     { eyes: P => ePupil(P,-1,[-0.8,-0.1]) + ePupil(P,1,[-0.8,-0.1]),
                   mouth: mO, blush: 0.62 },
  "surpresa":    { eyes: both(eBig),  mouth: mBigO,  blush: 0.68 },
  "encantada":   { eyes: both(eHeart), mouth: mSmile, extra: exHearts, blush: 0.78 },
  "brilho":      { eyes: P => eSparkle(P,-1) + eSparkle(P,1,-1),
                   mouth: (P,u) => mO(P,u,1.1), blush: 0.70 },
  "piscando":    { eyes: P => eDot(P,-1) + eArc(P,1), mouth: mSmirk, blush: 0.66 },
  "timida":      { eyes: both(eArc),  mouth: mSmall, blush: 0.95 },
  "nervosa":     { eyes: both(eDot),  mouth: mWave,  extra: exSweat, blush: 0.58 },
  "emocionada":  { eyes: both(eBig),  mouth: mSmile, extra: exTear,  blush: 0.72 },
  "triste":      { eyes: both(eSad),  mouth: mFrown, blush: 0.42 },
  "cansada":     { eyes: both(eDroop), mouth: mLine, blush: 0.45 },
  "dormindo":    { eyes: both(eDash), mouth: mLine,  extra: exZzz,  blush: 0.50 },
};

/* Monta a Cady inteira.
   opts: { expression, palette, uid, rays, amps, shadow, background } */
export function cady(opts = {}) {
  const { expression = "repouso", palette = "rosa-quartzo", uid = "c",
          rays: withRays = true, amps = null, shadow = true, background = true } = opts;
  const P = typeof palette === "string" ? PALETTES[palette] : palette;
  const E = EXPRESSIONS[expression];
  let s = defs(P, uid);
  if (background) s += `<rect width="${Q}" height="${Q}" fill="${P.bg}"/>`;
  s += `<ellipse class="halo" cx="${CX}" cy="${CY}" rx="${(R*1.62).toFixed(0)}" ` +
       `ry="${(R*1.58).toFixed(0)}" fill="url(#glow${uid})"/>`;
  if (shadow) s += `<ellipse class="contact" cx="${CX}" cy="${(CY+R*1.22).toFixed(0)}" ` +
       `rx="${(R*0.86).toFixed(0)}" ry="${(R*0.20).toFixed(0)}" fill="url(#drop${uid})"/>`;
  if (withRays) s += rays(P, 72, amps);
  // A boca sai num grupo proprio: e o que permite a Cady parada murmurar por
  // CSS (ver .cady-mouth em CADY_CSS) sem precisar de JS nem de camadas.
  s += `<g class="core">` + volume(P, uid) + blush(P, E.blush) +
       E.eyes(P) + `<g class="cady-mouth">` + E.mouth(P, uid) + `</g></g>`;
  if (E.extra) s += E.extra(P);
  return s;
}

export const cadySVG = (opts = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Q} ${Q}" ` +
  `width="${opts.size || Q}" height="${opts.size || Q}" role="img" ` +
  `aria-label="${opts.label || "Cady"}">${cady(opts)}</svg>`;

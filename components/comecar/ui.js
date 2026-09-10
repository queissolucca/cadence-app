'use client';

import { ICONS, LAND, WM_COLS, WM_ROWS, WM_PEOPLE, WM_LINKS } from '../../lib/comecar/data';

/* ---- ícones ------------------------------------------------------------ */
export function Icon({ name, className, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}
      dangerouslySetInnerHTML={{ __html: ICONS[name] || ICONS.spark }} />
  );
}
export const Glyph = ({ name, size = 24 }) => (
  <span className="glyph" style={{ '--gs': `${size}px` }}><Icon name={name} /></span>
);

/* ---- esfera ------------------------------------------------------------
   Um ponto com volume, não um disco: empilha as mesmas camadas que volume()
   usa na Cady — sombra de contato, corpo em gradiente, luz de borda, brilho
   especular — na escala de um ponto. Os gradientes vivem num <defs> único no
   documento (SphereDefs) porque objectBoundingBox escala com a forma, então o
   mesmo defs serve pra um ponto de 2px e pra um de 26px. */
export function SphereDefs() {
  return (
    <svg id="sphere-defs" width="0" height="0" aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <radialGradient id="sphOn" cx="0.36" cy="0.28" r="0.82">
          <stop offset="0" stopColor="#9FF0C4" /><stop offset="0.42" stopColor="#39B26E" />
          <stop offset="1" stopColor="#166B42" /></radialGradient>
        <radialGradient id="sphOff" cx="0.36" cy="0.28" r="0.82">
          <stop offset="0" stopColor="#3B353B" /><stop offset="0.42" stopColor="#241F24" />
          <stop offset="1" stopColor="#141114" /></radialGradient>
        <radialGradient id="sphInk" cx="0.36" cy="0.28" r="0.82">
          <stop offset="0" stopColor="#FFFFFF" /><stop offset="0.44" stopColor="#E4E4DA" />
          <stop offset="1" stopColor="#9E9E93" /></radialGradient>
        <radialGradient id="sphMute" cx="0.36" cy="0.28" r="0.82">
          <stop offset="0" stopColor="#8A828A" /><stop offset="0.44" stopColor="#5F585F" />
          <stop offset="1" stopColor="#3A353A" /></radialGradient>
        <radialGradient id="sphRimOn" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.52" stopColor="#9FF0C4" stopOpacity="0" />
          <stop offset="0.86" stopColor="#9FF0C4" stopOpacity="0.55" />
          <stop offset="1" stopColor="#9FF0C4" stopOpacity="0" /></radialGradient>
        <radialGradient id="sphRimOff" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.52" stopColor="#6E666E" stopOpacity="0" />
          <stop offset="0.86" stopColor="#6E666E" stopOpacity="0.42" />
          <stop offset="1" stopColor="#6E666E" stopOpacity="0" /></radialGradient>
        <radialGradient id="sphSpec" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.62" />
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></radialGradient>
        <radialGradient id="sphDrop" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000000" stopOpacity="0.62" />
          <stop offset="0.60" stopColor="#000000" stopOpacity="0.24" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" /></radialGradient>
        <radialGradient id="sphGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.34" stopColor="#2E9E5B" stopOpacity="0.46" />
          <stop offset="0.64" stopColor="#2E9E5B" stopOpacity="0.16" />
          <stop offset="1" stopColor="#2E9E5B" stopOpacity="0" /></radialGradient>
      </defs>
    </svg>
  );
}

export function Sphere({ x, y, r, tone = 'on', glow = false, className = '', style }) {
  const g = tone === 'on' ? 'sphOn' : tone === 'off' ? 'sphOff'
    : tone === 'ink' ? 'sphInk' : 'sphMute';
  const rim = tone === 'on' ? 'sphRimOn' : 'sphRimOff';
  const f = v => +(+v).toFixed(1);
  return (
    <g className={className} style={style}>
      {glow && <circle cx={f(x)} cy={f(y)} r={f(r * 3.1)} fill="url(#sphGlow)" />}
      <ellipse cx={f(x)} cy={f(y + r * 1.02)} rx={f(r * 0.98)} ry={f(r * 0.34)} fill="url(#sphDrop)" />
      <circle cx={f(x)} cy={f(y)} r={f(r)} fill={`url(#${g})`} />
      <circle cx={f(x)} cy={f(y)} r={f(r)} fill={`url(#${rim})`} />
      <ellipse cx={f(x - r * 0.32)} cy={f(y - r * 0.34)} rx={f(r * 0.46)} ry={f(r * 0.35)}
        fill="url(#sphSpec)" />
    </g>
  );
}

/* ---- constelação (pontos ligados) -------------------------------------- */
export function Constelacao({ nodes, lit }) {
  const w = 340, h = 175;
  return (
    <div className="constel">
      <svg viewBox={`0 0 ${w} ${h}`}>
        {nodes.map((n, i) => {
          if (i === 0) return null;
          const p = nodes[i - 1];
          const len = Math.hypot(n.x - p.x, n.y - p.y);
          return (
            <line key={`w${i}`} className={`cn-wire ${i <= lit ? 'on' : ''}`}
              style={{ '--len': len, animationDelay: `${i * 0.14}s` }}
              x1={p.x} y1={p.y} x2={n.x} y2={n.y} />
          );
        })}
        {nodes.map((n, i) => {
          const on = i < lit;
          const r = on ? 6.5 : 4.5;
          return (
            <g key={`d${i}`}>
              {on && i === lit - 1 && <circle className="cn-halo" cx={n.x} cy={n.y} r="8" />}
              <Sphere x={n.x} y={n.y} r={r} tone={on ? 'on' : 'off'}
                glow={on && i === lit - 1} className={`cn-pt ${on ? 'on' : ''}`}
                style={{ animationDelay: `${(i * 0.14).toFixed(2)}s` }} />
              {n.l && <text className="cn-lbl" x={n.x} y={n.y + (n.below ? 20 : -14)}>{n.l}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---- mapa mundi pontilhado --------------------------------------------- */
export function WorldMap() {
  const W = 360, H = 168, pad = 8;
  const sx = (W - pad * 2) / (WM_COLS - 1), sy = (H - pad * 2) / (WM_ROWS - 1);
  const X = c => +(pad + c * sx).toFixed(1);
  const Y = r => +(pad + r * sy).toFixed(1);

  const dots = [];
  LAND.forEach((row, r) => {
    for (let c = 0; c < WM_COLS; c++) {
      if (row[c] !== '#') continue;
      // fura alguns pra borda não ficar reta demais, e varia o tom pra dar
      // profundidade em vez de uma malha uniforme
      if (((c * 7 + r * 13) % 13) === 0) continue;
      dots.push(
        <circle key={`${c}-${r}`} className="wm-d" cx={X(c)} cy={Y(r)} r="1.7"
          opacity={(0.55 + ((c * 5 + r * 3) % 4) * 0.15).toFixed(2)} />
      );
    }
  });

  return (
    <div className="wmap">
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <g className="wm-land">{dots}</g>
        {WM_LINKS.map(([i, j], k) => {
          const A = WM_PEOPLE[i], B = WM_PEOPLE[j];
          const x1 = X(A.c), y1 = Y(A.r), x2 = X(B.c), y2 = Y(B.r);
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
          const bow = Math.min(34, len * 0.24);
          const cx = (mx - dy / len * bow).toFixed(1), cy = (my + dx / len * bow).toFixed(1);
          return (
            <path key={`w${k}`} className="wm-w" d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`}
              pathLength="1" style={{ animationDelay: `${(0.30 + k * 0.20).toFixed(2)}s` }} />
          );
        })}
        {WM_PEOPLE.map((q, i) => (
          <Sphere key={`p${i}`} x={X(q.c)} y={Y(q.r)} r={3.4} tone="on" glow
            className="wm-p" style={{ animationDelay: `${(0.10 + i * 0.13).toFixed(2)}s` }} />
        ))}
      </svg>
      {WM_PEOPLE.map((q, i) => (
        <div key={`f${i}`} className="wm-f" title={q.n}
          style={{
            left: `${(X(q.c) / W * 100).toFixed(2)}%`, top: `${(Y(q.r) / H * 100).toFixed(2)}%`,
            '--k': q.k, animationDelay: `${(0.10 + i * 0.13).toFixed(2)}s`,
          }}>
          <span className="wm-i">{q.i}</span>
          <span className="wm-flag">{q.f}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- selo de louros ----------------------------------------------------
   Os ramos são desenhados (não imagem): um caule fino em C aberto pro texto,
   com folhas pequenas e separadas só no lado de fora — folha grande e
   sobreposta le como pena, não como louro. */
function ramo(side) {
  const d = side < 0 ? -1 : 1;
  const P0 = [46 * d, 76], P1 = [8 * d, 46], P2 = [30 * d, 6];
  const at = t => {
    const u = 1 - t;
    return [u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0],
            u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]];
  };
  const tan = t => {
    const u = 1 - t;
    return [2 * u * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]),
            2 * u * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1])];
  };
  const folhas = [];
  const N = 11;
  for (let i = 0; i < N; i++) {
    const t = 0.06 + (i / (N - 1)) * 0.88;
    const [x, y] = at(t);
    const [tx, ty] = tan(t);
    const a = Math.atan2(ty, tx) * 180 / Math.PI + (side < 0 ? -50 : 50);
    const len = 7.6 - 2.9 * t;
    folhas.push(
      <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(1)})`}>
        <ellipse cx={(len * 0.78).toFixed(1)} cy="0" rx={len.toFixed(1)}
          ry={(len * 0.30).toFixed(1)} fill="currentColor"
          opacity={(0.82 - 0.035 * i).toFixed(2)} />
      </g>
    );
  }
  return (
    <>
      <path d={`M${P0[0].toFixed(1)},${P0[1]} Q${P1[0].toFixed(1)},${P1[1]} ${P2[0].toFixed(1)},${P2[1]}`}
        fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" opacity=".7" />
      {folhas}
    </>
  );
}

export function Laurel({ frase, sub }) {
  return (
    <div className="laurel">
      <svg className="lbranch l" viewBox="-56 0 60 80" aria-hidden="true">{ramo(-1)}</svg>
      <div className="lmid">
        <div className="lstars" aria-hidden="true">{'★'.repeat(5)}</div>
        <p className="lquote">&ldquo;{frase}&rdquo;</p>
        <span className="lsub">{sub}</span>
      </div>
      <svg className="lbranch r" viewBox="-4 0 60 80" aria-hidden="true">{ramo(1)}</svg>
    </div>
  );
}

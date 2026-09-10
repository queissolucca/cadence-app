'use client';

/* Curva suave: Catmull-Rom convertido em bezier, pra a linha passar pelos
   pontos em vez de só se aproximar deles. */
function suave(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}`
      + ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}`
      + ` ${p2[0]},${p2[1]}`;
  }
  return d;
}

/* Duas curvas que se desenham: com a Cady e sem conversar. O contraste entre
   elas é o argumento da tela — por isso a de cima é clara e a de baixo apagada. */
export function CurveChart({ fim }) {
  const W = 302, H = 158, x0 = 14, x1 = W - 16, yTop = 26, yBot = H - 34;
  const COM = [.08, .13, .26, .50, .70, .84, .93];
  const SEM = [.08, .10, .13, .16, .19, .23, .27];
  const px = i => x0 + (x1 - x0) * i / (COM.length - 1);
  const py = v => yBot - (yBot - yTop) * v;
  const ptsCom = COM.map((v, i) => [px(i), py(v)]);
  const ptsSem = SEM.map((v, i) => [px(i), py(v)]);
  const last = ptsCom[ptsCom.length - 1], lastS = ptsSem[ptsSem.length - 1];

  const dots = (pts, cls) => pts.map((p, i) => (
    <circle key={`${cls}${i}`} className={`cdot ${cls}`} cx={p[0]} cy={p[1]} r="2.9"
      style={{ animationDelay: `${(0.25 + i * 0.19).toFixed(2)}s` }} />
  ));

  return (
    <div className="card chart">
      <span className="kicker">Confiança pra falar</span>
      <svg viewBox={`0 0 ${W} ${H}`} className="csvg">
        {[0, 1, 2].map(i => (
          <line key={i} className="cgrid" x1={x0} x2={x1}
            y1={(yTop + (yBot - yTop) * i / 2.4).toFixed(1)}
            y2={(yTop + (yBot - yTop) * i / 2.4).toFixed(1)} />
        ))}
        <path className="cline sem" d={suave(ptsSem)} pathLength="1" />
        <path className="cline com" d={suave(ptsCom)} pathLength="1" />
        {dots(ptsSem, 'sem')}{dots(ptsCom, 'com')}
        <circle className="cend sem" cx={lastS[0]} cy={lastS[1]} r="4.4" />
        <circle className="cend com" cx={last[0]} cy={last[1]} r="5" />
      </svg>
      <div className="clabels">
        <span className="cpill com">com a Cady</span>
        <span className="cpill sem">sem conversar</span>
      </div>
      <div className="cfoot"><span>hoje</span><span>{fim}</span></div>
    </div>
  );
}

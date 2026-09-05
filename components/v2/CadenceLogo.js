// Logo do Cadence: um "domo" de pontos (pequenos → grandes, o último verde)
// sobre a palavra "cadence". Recriado em SVG (escala em qualquer tamanho, sem
// depender de arquivo de imagem). Componente puro — serve em server e client.
//
// Props:
//   word     tamanho da fonte da palavra (px). O domo escala junto. default 28
//   variant  'dark' (padrão, fundo claro) | 'light' (fundo escuro)
//   showMark mostra o domo de pontos (default true). false = só a palavra.
export function CadenceLogo({ word = 28, variant = 'dark', showMark = true, style, className }) {
  const dark = variant === 'light' ? '#F6F9F4' : '#14201A';
  const green = '#2E9E5B';

  // Pontos ao longo de um semicírculo: crescem da esquerda pra direita; o
  // último (canto inferior direito) é verde.
  const N = 20;
  const cx = 100;
  const cy = 108;
  const R = 90;
  const a0 = 196;
  const a1 = -16;
  const dots = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const ang = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
    dots.push({
      x: cx + R * Math.cos(ang),
      y: cy - R * Math.sin(ang),
      r: 1.6 + (8.5 - 1.6) * t,
      green: i === N - 1,
    });
  }
  const domeW = word * 5;

  return (
    <span
      role="img"
      aria-label="Cadence"
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, ...style }}
    >
      {showMark && (
        <svg viewBox="0 0 200 118" width={domeW} height={domeW * 0.59} style={{ display: 'block', marginBottom: word * 0.14 }} aria-hidden="true">
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.green ? green : dark} />
          ))}
        </svg>
      )}
      <span style={{ fontFamily: 'var(--font-ui-v2, Inter, system-ui, -apple-system, sans-serif)', fontWeight: 900, fontSize: word, letterSpacing: '-0.04em', color: dark }}>
        cadence
      </span>
    </span>
  );
}

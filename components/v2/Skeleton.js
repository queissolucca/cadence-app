// Usado pelos loading.js de rota em /v2 — Next.js mostra isto
// automaticamente enquanto o Server Component da página busca dados.
export function SkeletonScreen({ rows = 3 }) {
  return (
    <div className="v2-bg" style={{ minHeight: '100dvh', padding: '20px 20px 40px', fontFamily: 'var(--font-ui-v2)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="v2-skeleton" style={{ height: 28, width: '55%' }} />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="v2-skeleton" style={{ height: 84 }} />
        ))}
      </div>
    </div>
  );
}

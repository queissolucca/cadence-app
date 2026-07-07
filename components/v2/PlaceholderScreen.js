import { Card } from '../ui';
import { BackHeader } from './BackHeader';

// Placeholder das telas fora do shell (fora do escopo desta etapa — só
// existe pra /praticar/writing etc. terem um destino real em vez de 404).
export function PlaceholderScreen({ title, note }) {
  return (
    <div className="v2-bg" style={{ minHeight: '100dvh', padding: '24px 20px 40px', fontFamily: 'var(--font-ui-v2)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <BackHeader title={title} />
        <Card>
          <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>{note || 'Essa tela ainda não foi construída — placeholder por enquanto.'}</p>
        </Card>
      </div>
    </div>
  );
}

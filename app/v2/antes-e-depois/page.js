import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { getBeforeAfterAvailability } from '../../../lib/beforeAfter';
import { BackHeader } from '../../../components/v2/BackHeader';
import { BeforeAfterClient } from '../../../components/v2/BeforeAfterClient';
import { Card } from '../../../components/ui';

function formatDate(d) {
  return new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function AntesEDepoisPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { hasBaseline, available, nextDate, lastCheck, profile } = await getBeforeAfterAvailability(supabase, user);

  if (!hasBaseline) {
    return (
      <div className="v2-bg" style={{ minHeight: '100dvh', padding: '24px 20px 40px', fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <BackHeader title="Antes e depois" />
          <Card>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
              Ainda não encontramos sua pergunta do Dia 1 — isso é definido durante o onboarding.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (!available && !lastCheck) {
    return (
      <div className="v2-bg" style={{ minHeight: '100dvh', padding: '24px 20px 40px', fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <BackHeader title="Antes e depois" />
          <Card>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>Ainda não dessa vez</p>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
              A comparação fica disponível depois de 2 semanas de uso, pra dar tempo de aparecer evolução de verdade.
              Disponível em {formatDate(nextDate)}.
            </p>
            <Link href="/v2" className="v2-card-dark" style={{ display: 'block', marginTop: 16, textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              Ir para Hoje
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="v2-bg" style={{ minHeight: '100dvh', padding: '24px 20px 40px', fontFamily: 'var(--font-ui-v2)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <BackHeader title="Antes e depois" />
        <BeforeAfterClient
          initialCheck={lastCheck}
          thenDate={profile.baseline_date}
          locked={!available}
          nextDateLabel={nextDate ? formatDate(nextDate) : ''}
          question={profile.baseline_question}
          accent={profile.voice_accent}
          canRespond={available}
        />
      </div>
    </div>
  );
}

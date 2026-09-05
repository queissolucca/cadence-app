import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { ThemeProviderV2 } from '../../components/v2/ThemeProviderV2';
import { OnboardingClient } from '../../components/v2/OnboardingClient';
import { CadenceLogo } from '../../components/v2/CadenceLogo';

export const dynamic = 'force-dynamic';

// Onboarding pré-pagamento: 5 perguntas rápidas logo após criar a conta. Ao
// terminar, salva e vai pro /pagamento. Quem já respondeu pula direto.
export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Sem redirect próprio aqui: o middleware é a única autoridade da ordem do
  // funil (onboarding → pagamento → nome → app). Antes esta página tinha um
  // atalho que checava a TABELA onboarding e pulava pro /pagamento, o que
  // conflitava com o gate por profiles.onboarded_at e furava o fluxo.
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || '';

  return (
    <ThemeProviderV2>
      <div className="v2-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <CadenceLogo word={26} />
          </div>
          <div className="v2-card">
            <OnboardingClient firstName={firstName} />
          </div>
        </div>
      </div>
    </ThemeProviderV2>
  );
}

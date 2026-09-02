import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { ThemeProviderV2 } from '../../components/v2/ThemeProviderV2';
import { OnboardingClient } from '../../components/v2/OnboardingClient';

export const dynamic = 'force-dynamic';

// Onboarding pré-pagamento: 5 perguntas rápidas logo após criar a conta. Ao
// terminar, salva e vai pro /pagamento. Quem já respondeu pula direto.
export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const onb = await supabase.from('onboarding').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!onb.error && onb.data) {
    const { data: paid } = await supabase.from('paid_emails').select('email').eq('email', user.email).maybeSingle();
    redirect(paid ? '/v2' : '/pagamento');
  }

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || '';

  return (
    <ThemeProviderV2>
      <div className="v2-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)' }}>cadence</span>
          </div>
          <div className="v2-card">
            <OnboardingClient firstName={firstName} />
          </div>
        </div>
      </div>
    </ThemeProviderV2>
  );
}

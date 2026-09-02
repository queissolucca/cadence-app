import { ThemeProviderV2 } from '../../../components/v2/ThemeProviderV2';
import { DemoOnboarding } from '../../../components/v2/DemoOnboarding';

// Onboarding pré-cadastro: a pessoa experimenta a Cady (falando ou escrevendo)
// antes de criar a conta. Público (sem login).
export const dynamic = 'force-dynamic';

export default function InicioOnboardingPage() {
  return (
    <ThemeProviderV2>
      <div className="v2-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)' }}>cadence</span>
          </div>
          <div className="v2-card">
            <DemoOnboarding />
          </div>
        </div>
      </div>
    </ThemeProviderV2>
  );
}

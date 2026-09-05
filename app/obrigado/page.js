import { ThemeProviderV2 } from '../../components/v2/ThemeProviderV2';
import { ObrigadoPoller } from './ObrigadoPoller';
import { CadenceLogo } from '../../components/v2/CadenceLogo';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pagamento — Cadence' };

// completionUrl do checkout. É apenas cosmética: o acesso só é liberado pelo
// webhook. Aqui a gente confirma por polling e só então libera o botão de entrar.
export default function ObrigadoPage() {
  return (
    <ThemeProviderV2>
      <div className="v2-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <CadenceLogo word={28} />
          </div>
          <ObrigadoPoller />
        </div>
      </div>
    </ThemeProviderV2>
  );
}

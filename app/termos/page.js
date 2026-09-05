import { ThemeProviderV2 } from '../../components/v2/ThemeProviderV2';
import { TERMS_CLAUSES, TERMS_CLOSING, TERMS_UPDATED_LABEL } from '../../lib/terms';
import { CadenceLogo } from '../../components/v2/CadenceLogo';

export const metadata = {
  title: 'Termos e Condições — Cadence',
  description: 'Termos e Condições de Uso da plataforma Cadence.',
};

// Página pública dos Termos e Condições (sem autenticação). Fonte do texto:
// lib/terms.js — a mesma usada no aceite do onboarding.
export default function TermosPage() {
  return (
    <ThemeProviderV2>
      <div className="v2-bg" style={{ minHeight: '100dvh', padding: '32px 20px 64px', fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ width: '100%', maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <CadenceLogo word={26} />
          </div>
          <div className="v2-card" style={{ padding: '28px 26px' }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink)' }}>
              Termos e Condições de Uso
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
              Última atualização: {TERMS_UPDATED_LABEL}
            </p>

            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {TERMS_CLAUSES.map((c) => (
                <section key={c.n}>
                  <h2 style={{ fontSize: 15.5, fontWeight: 800, margin: 0, color: 'var(--ink)', lineHeight: 1.35 }}>
                    {c.n}. {c.title}
                  </h2>
                  <p style={{ margin: '7px 0 0', fontSize: 14.5, lineHeight: 1.65, color: 'var(--ink-soft)' }}>
                    {c.body}
                  </p>
                </section>
              ))}
            </div>

            <p style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--line)', fontSize: 13.5, fontStyle: 'italic', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
              {TERMS_CLOSING}
            </p>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <a href="/v2" style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', textDecoration: 'none' }}>← Voltar ao Cadence</a>
          </div>
        </div>
      </div>
    </ThemeProviderV2>
  );
}

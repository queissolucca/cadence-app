import { createClient } from '../../lib/supabase/server';
import { Card } from '../../components/ui';
import { ThemeProviderV2 } from '../../components/v2/ThemeProviderV2';

const btnStyle = {
  border: 'none', borderRadius: 12, padding: '13px 16px', fontWeight: 700,
  background: 'var(--green)', color: '#fff', fontSize: 15, width: '100%', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block', boxSizing: 'border-box',
};

// Rota top-level protegida (ver middleware.js) — logado mas com email fora
// de paid_emails cai aqui antes de qualquer coisa em /v2. O webhook do
// Kiwify (app/api/webhooks/kiwify) é o único jeito de um email entrar em
// paid_emails agora, então chegar aqui quer dizer "ainda não achamos um
// pagamento aprovado pra esse email" — o mais comum é ter pago com um email
// diferente do que usou pra logar.
export default async function PagamentoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const paymentLinkUrl = process.env.NEXT_PUBLIC_PAYMENT_LINK_URL;

  return (
    <ThemeProviderV2>
      <div className="v2-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)' }}>cadence</span>
          </div>
          <Card>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              acesso pendente
            </span>
            <p style={{ margin: '10px 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              ainda não encontramos um pagamento aprovado pra este email
            </p>
            {user?.email && (
              <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--ink-soft)' }}>
                logado como <strong>{user.email}</strong>
              </p>
            )}

            <div style={{ background: 'var(--v2-card-bg)', border: '1px solid var(--line)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
              <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff', background: 'var(--green)', borderRadius: 6, padding: '3px 8px', marginBottom: 10 }}>
                acesso vitalício · lançamento
              </span>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>R$ 89,90<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-soft)' }}> pagamento único · vitalício</span></div>
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
                + sessões diárias de ~10 minutos<br />
                + correção direta com o porquê<br />
                + repetição espaçada (hoje → amanhã → 1 sem → 1 mês)<br />
                + cenários reais ilimitados de escrita e fala
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                estamos lançando o cadence agora e só as primeiras pessoas que entrarem com a gente nessa fase têm o privilégio de pagar uma vez e ter acesso vitalício. depois do lançamento, a cobrança passa a ser mensal.
              </p>
            </div>

            {paymentLinkUrl && (
              <a href={paymentLinkUrl} style={btnStyle}>ainda não paguei — ir para o pagamento</a>
            )}
            <a href="/pagamento" style={{ ...btnStyle, background: 'none', border: '1px solid var(--line)', color: 'var(--ink)', marginTop: 10 }}>
              já paguei — verificar de novo
            </a>

            <p style={{ margin: '14px 0 0', fontSize: 11.5, color: 'var(--ink-soft)', textAlign: 'center' }}>
              já pagou com outro email? entre com o mesmo email usado na compra.
            </p>
          </Card>
        </div>
      </div>
    </ThemeProviderV2>
  );
}

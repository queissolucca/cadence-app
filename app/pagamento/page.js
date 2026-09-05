import { createClient } from '../../lib/supabase/server';
import { Card } from '../../components/ui';
import { ThemeProviderV2 } from '../../components/v2/ThemeProviderV2';
import { TrocarLoginButton } from './TrocarLoginButton';
import { CheckoutButton } from '../../components/v2/CheckoutButton';

const btnStyle = {
  border: 'none', borderRadius: 12, padding: '13px 16px', fontWeight: 700,
  background: 'var(--green)', color: '#fff', fontSize: 15, width: '100%', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block', boxSizing: 'border-box',
};

// Rota pública (ver middleware.js) — destino do CTA final do onboarding
// (/inicio/onboarding), então precisa funcionar sem sessão. Quem chega aqui
// logado mas com email fora de paid_emails (fluxo antigo: caiu em /v2 sem ter
// pago) vê uma variação da mesma tela. O webhook do Kiwify
// (app/api/webhooks/kiwify) é o único jeito de um email entrar em
// paid_emails.
export default async function PagamentoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Renovação: se o email já pagou mas o acesso de 3 meses venceu, a tela vira
  // "acesso expirado — renove" em vez de "acesso pendente".
  let expired = false;
  if (user?.email) {
    const { data: paidRow } = await supabase
      .from('paid_emails')
      .select('expires_at')
      .eq('email', user.email)
      .maybeSingle();
    if (paidRow?.expires_at && new Date(paidRow.expires_at) <= new Date()) expired = true;
  }

  return (
    <ThemeProviderV2>
      <div className="v2-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)' }}>cadence</span>
          </div>
          <Card>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {expired ? 'acesso expirado' : user ? 'acesso pendente' : 'último passo'}
            </span>
            <p style={{ margin: '10px 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              {expired
                ? 'seu acesso de 3 meses acabou — renove pra continuar destravando'
                : user
                  ? 'ainda não encontramos um pagamento aprovado pra este email'
                  : 'destrave seu inglês com a Cady, sua professora de IA'}
            </p>
            {user?.email && (
              <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--ink-soft)' }}>
                logado como <strong>{user.email}</strong>
              </p>
            )}

            <div style={{ background: 'var(--v2-card-bg)', border: '1px solid var(--line)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
              <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff', background: 'var(--green)', borderRadius: 6, padding: '3px 8px', marginBottom: 10 }}>
                🔥 70% OFF · só no lançamento
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, color: 'var(--ink-soft)', textDecoration: 'line-through' }}>R$ 296,90</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>R$ 89,90</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-soft)' }}>· 3 meses de acesso</span>
              </div>
              <div style={{ marginTop: 2, fontSize: 13.5, fontWeight: 700, color: 'var(--green-dark, var(--green))' }}>menos de R$ 1 por dia — 70% de desconto pra quem chega primeiro</div>
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
                + a Cady, sua professora de inglês por IA — conversa real, por <strong>voz ou texto</strong><br />
                + correção assertiva na hora: gramática, conjugação e o porquê<br />
                + trilha do intermediário ao avançado, com XP e patentes (Aprendiz → Nativo)<br />
                + revisão inteligente e personalizada<br />
                + a Cady <strong>lembra de você</strong> e personaliza cada conversa
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                não é chatbot genérico: é uma IA que conversa como gente de verdade, corrige do jeito que faz você evoluir e se lembra da sua vida pra cada aula ser sua. <strong>Imagine pagar esse valor para ter um professor particular que te conheça e que você possa treinar todo dia! Esse é o Cadence!</strong>
              </p>
              <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                <strong>Preço de lançamento: de R$ 296,90 por R$ 89,90 (70% off), só pra quem chega agora, no começo</strong> — depois volta ao valor cheio e a cobrança passa a ser mensal.
              </p>
            </div>

            {user ? (
              <CheckoutButton
                planId="pro-trimestral"
                label={expired ? 'renovar acesso — cartão ou pix' : 'assinar — cartão ou pix'}
                style={btnStyle}
              />
            ) : (
              <a href="/login" style={btnStyle}>entrar para assinar</a>
            )}

            {user ? (
              <>
                <a href="/pagamento" style={{ ...btnStyle, background: 'none', border: '1px solid var(--line)', color: 'var(--ink)', marginTop: 10 }}>
                  já paguei — verificar de novo
                </a>
                <p style={{ margin: '14px 0 0', fontSize: 11.5, color: 'var(--ink-soft)', textAlign: 'center' }}>
                  já pagou com outro email? entre com o mesmo email usado na compra.
                </p>
                <TrocarLoginButton />
              </>
            ) : (
              <p style={{ margin: '14px 0 0', fontSize: 11.5, color: 'var(--ink-soft)', textAlign: 'center' }}>
                depois do pagamento, é só criar sua conta com o mesmo email pra acessar.
              </p>
            )}
          </Card>
        </div>
      </div>
    </ThemeProviderV2>
  );
}

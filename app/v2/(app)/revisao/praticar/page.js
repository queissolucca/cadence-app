import Link from 'next/link';
import { createClient } from '../../../../../lib/supabase/server';
import { DEFAULT_AGENT } from '../../../../../lib/track/sessionOptions';
import { isDue } from '../../../../../lib/track/srs';
import { ConversationClient } from '../../../../../components/v2/ConversationClient';

export const dynamic = 'force-dynamic';

// Praticar com a Cady — pega os cards vencidos e roda uma fala guiada em cima
// deles (a Cady puxa item por item). Ao encerrar, cada card sobe de caixa.
export default async function PraticarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || '';

  // Vencidos primeiro; resiliente caso a migration 0017 não tenha rodado.
  let rows = [];
  const withSrs = await supabase
    .from('review_saved')
    .select('id, term, example, category, box, due_at')
    .eq('user_id', user.id)
    .neq('status', 'learned')
    .order('due_at', { ascending: true })
    .limit(30);
  if (!withSrs.error) {
    rows = withSrs.data || [];
  } else {
    const { data } = await supabase
      .from('review_saved')
      .select('id, term, example, category')
      .eq('user_id', user.id)
      .neq('status', 'learned')
      .order('created_at', { ascending: true })
      .limit(30);
    rows = data || [];
  }

  const dueRows = rows.filter((r) => isDue(r));
  const items = (dueRows.length ? dueRows : rows).slice(0, 8);

  const back = (
    <Link
      href="/v2/revisao"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--ink-soft)', fontSize: 13, padding: '2px 0 12px' }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      Revisão
    </Link>
  );

  if (!items.length) {
    return (
      <>
        {back}
        <div className="v2-card" style={{ textAlign: 'center', padding: 26, color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.5 }}>
          Nada pra revisar agora. Guarde alguns itens (diga <strong>&quot;save this&quot;</strong> na conversa) e volte aqui.
        </div>
      </>
    );
  }

  return (
    <>
      {back}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 12, color: 'var(--green-dark, var(--green))' }}>REVISÃO FALADA</span>
        <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.5px', margin: '4px 0 0', color: 'var(--ink)' }}>Praticar com a Cady</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          A Cady vai puxar {items.length} {items.length === 1 ? 'card' : 'cards'} um por um pra você usar falando. Ao encerrar, eles sobem de caixa.
        </p>
      </div>

      <ConversationClient firstName={firstName} agent={DEFAULT_AGENT} reviewItems={items} />
    </>
  );
}

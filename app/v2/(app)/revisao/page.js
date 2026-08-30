import { createClient } from '../../../../lib/supabase/server';
import { RevisaoView } from '../../../../components/v2/RevisaoView';

// Aba Revisão — itens guardados pra treinar de novo, organizados por categoria
// e status. Salvos por voz na conversa ou manualmente.
export default async function RevisaoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // best-effort — a tabela pode não existir ainda (migration 0016), e as colunas
  // de SRS box/due_at podem faltar (migration 0017). Tenta o completo; cai pro
  // básico se der erro.
  let items = [];
  const withSrs = await supabase
    .from('review_saved')
    .select('id, term, example, note, category, status, box, due_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500);
  if (!withSrs.error) {
    items = withSrs.data || [];
  } else {
    const { data } = await supabase
      .from('review_saved')
      .select('id, term, example, note, category, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) items = data;
  }

  return (
    <>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--ink)' }}>Revisão</h1>
        <p style={{ margin: '6px 0 18px', fontSize: 14, color: 'var(--ink-soft)' }}>
          O que você guardou pra treinar de novo — organizado por categoria, e some quando você domina.
        </p>
      </div>
      <RevisaoView initialItems={items} />
    </>
  );
}

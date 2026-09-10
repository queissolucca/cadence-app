import { createClient } from '../../../../lib/supabase/server';
import { RevisaoView } from '../../../../components/v2/RevisaoView';
import { identidade, perfilV2 } from '../../../../lib/sessaoServidor';

// Aba Revisão — itens guardados pra treinar de novo, organizados por categoria
// e status. Salvos por voz na conversa ou manualmente.
export default async function RevisaoPage() {
  const supabase = createClient();
  const eu = await identidade();

  // Os cartões e o nome iam em fila, e o nome não depende dos cartões: agora
  // vão juntos. (O perfil, na prática, já veio no cache da requisição — quem
  // paga rede aqui é só a consulta dos cartões.)
  const [cartoes, profile] = await Promise.all([
    // best-effort — a tabela pode não existir ainda (migration 0016), e as
    // colunas de SRS box/due_at podem faltar (migration 0017). Tenta o
    // completo; cai pro básico se der erro.
    (async () => {
      const withSrs = await supabase
        .from('review_saved')
        .select('id, term, example, note, category, status, box, due_at, created_at')
        .eq('user_id', eu.id)
        .order('created_at', { ascending: false })
        .limit(500);
      if (!withSrs.error) return withSrs.data || [];
      const { data } = await supabase
        .from('review_saved')
        .select('id, term, example, note, category, status, created_at')
        .eq('user_id', eu.id)
        .order('created_at', { ascending: false })
        .limit(500);
      return data || [];
    })(),
    perfilV2(),
  ]);

  const items = cartoes;
  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || '';

  return (
    <>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--ink)' }}>Revisão</h1>
        <p style={{ margin: '6px 0 18px', fontSize: 14, color: 'var(--ink-soft)' }}>
          O que você guardou pra treinar de novo — organizado por categoria, e some quando você domina.
        </p>
      </div>
      <RevisaoView initialItems={items} firstName={firstName} />
    </>
  );
}

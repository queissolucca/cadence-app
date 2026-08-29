import { createClient } from '../../../../lib/supabase/server';
import { TrilhaView } from '../../../../components/v2/TrilhaView';

// C2/C3/C4 — a tela da trilha: nível (B1/B2) → módulos → lições, com progresso.
export default async function TrilhaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unidades já concluídas (best-effort — tabela pode não existir ainda).
  let completedIds = [];
  const { data } = await supabase.from('unit_progress').select('unit_id').eq('user_id', user.id);
  if (data) completedIds = data.map((r) => r.unit_id);

  return (
    <>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--ink)' }}>Trilha de aprendizagem</h1>
        <p style={{ margin: '6px 0 18px', fontSize: 14, color: 'var(--ink-soft)' }}>
          Do B1 ao C1, uma lição de 1–2 min por vez. Escolha o nível e continue de onde parou.
        </p>
      </div>
      <TrilhaView completedIds={completedIds} />
    </>
  );
}

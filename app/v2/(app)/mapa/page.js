import { createClient } from '../../../../lib/supabase/server';
import { computeScenarioStatuses } from '../../../../lib/scenarioProgress';
import { TRACKS } from '../../../../lib/tracks';
import { SectionHead } from '../../../../components/ui';
import { ScenarioTrail } from '../../../../components/v2/ScenarioTrail';
import { ExtraThemesPicker } from '../../../../components/v2/ExtraThemesPicker';

// Temas extras reaproveitam a mesma trilha estática (lib/tracks.js) já
// usada pelo sistema antigo — sem "trabalho remoto" aqui, que já é o eixo
// principal do catálogo de cenários novo.
const EXTRA_THEME_OPTIONS = TRACKS.filter((t) => t.id !== 'trabalho_remoto');

export default async function MapaPageV2() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: scenarios }, { data: stateRows }, { data: themeRows }] = await Promise.all([
    supabase.from('profiles').select('active_scenario_id').eq('id', user.id).single(),
    supabase.from('scenarios').select('*').order('stage', { ascending: true }),
    supabase.from('user_scenario_state').select('scenario_id, mastered_count, status').eq('user_id', user.id),
    supabase.from('user_theme_selection').select('track_id').eq('user_id', user.id),
  ]);

  const stateByScenarioId = {};
  (stateRows || []).forEach((row) => {
    stateByScenarioId[row.scenario_id] = { masteredCount: row.mastered_count };
  });
  const computedStatuses = computeScenarioStatuses(scenarios || [], stateByScenarioId);
  const scenariosWithStatus = (scenarios || []).map((s) => ({
    ...s,
    masteredCount: computedStatuses[s.id]?.masteredCount || 0,
    ratio: computedStatuses[s.id]?.ratio || 0,
    status: computedStatuses[s.id]?.status || 'locked',
  }));

  // Recomendado: entre os DESBLOQUEADOS (seleção agora é livre, não faz
  // sentido recomendar algo bloqueado sem caminho pra desbloquear), o que
  // não é o ativo agora e cujas skill_tags mais aparecem nos erros recentes.
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data: recentErrors } = await supabase
    .from('error_events')
    .select('category')
    .eq('user_id', user.id)
    .gte('occurred_at', fourteenDaysAgo);
  const categoryCounts = {};
  (recentErrors || []).forEach((e) => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  });

  let recommendedId = null;
  let bestScore = 0;
  scenariosWithStatus.filter((s) => s.status !== 'locked' && s.id !== profile?.active_scenario_id).forEach((s) => {
    const score = (s.skill_tags || []).reduce((sum, tag) => sum + (categoryCounts[tag] || 0), 0);
    if (score > bestScore) {
      bestScore = score;
      recommendedId = s.id;
    }
  });

  const activeScenario = scenariosWithStatus.find((s) => s.id === profile?.active_scenario_id);
  const extraTopicsSelection = (themeRows || []).map((r) => r.track_id);

  return (
    <>
      <div>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Inglês para trabalho
        </p>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)' }}>Mapa de cenários</h1>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
          Escolha livremente o que praticar entre os cenários liberados.
        </p>
      </div>

      <ScenarioTrail scenarios={scenariosWithStatus} activeScenarioId={profile?.active_scenario_id} recommendedId={recommendedId} />

      <div className="v2-card">
        <SectionHead title="Temas extras" />
        <p style={{ margin: '8px 0 12px', fontSize: 13, color: 'var(--ink-soft)' }}>
          Ampliam de onde vem o conteúdo novo, sem afetar seu estágio atual.
        </p>
        <ExtraThemesPicker themes={EXTRA_THEME_OPTIONS} initialSelection={extraTopicsSelection} />
      </div>

      <a href="/v2/roleplay" style={{ textDecoration: 'none' }}>
        <div className="v2-card-dark">
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Roleplay · {activeScenario?.title || 'seu cenário atual'}
          </span>
          <p style={{ margin: '8px 0 14px', fontSize: 13.5, opacity: 0.8 }}>
            Uma conversa curta dentro do cenário atual. Complementa a sessão do dia, não substitui.
          </p>
          <span style={{ display: 'inline-block', fontWeight: 700, fontSize: 14 }}>Praticar roleplay →</span>
        </div>
      </a>
    </>
  );
}

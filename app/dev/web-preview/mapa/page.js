import { TRACKS } from '../../../../lib/tracks';
import { SectionHead } from '../../../../components/ui';
import { ScenarioTrail } from '../../../../components/v2/ScenarioTrail';
import { ExtraThemesPicker } from '../../../../components/v2/ExtraThemesPicker';
import { MOCK_PROFILE, MOCK_SCENARIOS } from '../_mock';

const EXTRA_THEME_OPTIONS = TRACKS.filter((t) => t.id !== 'trabalho_remoto');

export default function MapaWebPreviewPage() {
  const activeScenario = MOCK_SCENARIOS.find((s) => s.id === MOCK_PROFILE.active_scenario_id);

  return (
    <>
      <div>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Inglês para trabalho
        </p>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)' }}>Mapa de cenários</h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--ink-soft)' }}>
          Escolha livremente o que praticar entre os cenários liberados.
        </p>
      </div>

      <ScenarioTrail scenarios={MOCK_SCENARIOS} activeScenarioId={MOCK_PROFILE.active_scenario_id} recommendedId="tr_1_w3" />

      <div className="web-grid-2">
        <div className="v2-card">
          <SectionHead title="Temas extras" />
          <p style={{ margin: '8px 0 12px', fontSize: 13, color: 'var(--ink-soft)' }}>
            Ampliam de onde vem o conteúdo novo, sem afetar seu estágio atual.
          </p>
          <ExtraThemesPicker themes={EXTRA_THEME_OPTIONS} initialSelection={['viagem']} />
        </div>

        <div className="v2-card-dark" style={{ height: '100%' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Roleplay · {activeScenario?.title}
          </span>
          <p style={{ margin: '8px 0 14px', fontSize: 13.5, opacity: 0.8 }}>
            Uma conversa curta dentro do cenário atual. Complementa a sessão do dia, não substitui.
          </p>
          <span style={{ display: 'inline-block', fontWeight: 700, fontSize: 14 }}>Praticar roleplay →</span>
        </div>
      </div>
    </>
  );
}

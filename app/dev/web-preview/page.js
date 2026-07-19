import { AppHeader } from '../../../components/ui';
import { PlayButton } from '../../../components/v2/PlayButton';
import { ScenarioSwitcher } from '../../../components/v2/ScenarioSwitcher';
import {
  MOCK_PROFILE, MOCK_SCENARIOS, MOCK_DUE_PHRASES, MOCK_CONTENT,
  MOCK_LAST_ERROR, MOCK_TOP_ERROR_BANNER, MOCK_WEEK_DOTS,
} from './_mock';

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()),
  );
  if (hour < 12) return 'Bom dia! Vamos praticar?';
  if (hour < 18) return 'Boa tarde! Vamos praticar?';
  return 'Boa noite! Vamos praticar?';
}

export default function HojeWebPreviewPage() {
  const profile = MOCK_PROFILE;
  const activeScenario = MOCK_SCENARIOS.find((s) => s.id === profile.active_scenario_id) || null;
  const writingExercises = MOCK_CONTENT.exercises.writing;
  const speakingExercises = MOCK_CONTENT.exercises.speaking;
  const daysWithSessionCount = MOCK_WEEK_DOTS.filter((d) => d.done).length;
  const accent = profile.voice_accent;
  const rate = profile.audio_speed;

  return (
    <>
      <div className="mobile-only">
        <AppHeader streak={profile.streak_count} streakShields={profile.streak_shields} avatarInitial={profile.full_name} />
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{getGreeting()}</p>
      </div>
      <div className="desktop-only">
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', margin: 0, color: 'var(--ink)' }}>{getGreeting()}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-soft)' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })}
        </p>
      </div>

      <div className="web-grid-2">
        <div className="v2-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Meta semanal</span>
            <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 12.5, color: 'var(--ink)' }}>
              {daysWithSessionCount}/{profile.weekly_cadence_target} esta semana
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {MOCK_WEEK_DOTS.map((d) => (
              <div
                key={d.key}
                title={d.label}
                style={{
                  flex: 1, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
                  background: d.done ? 'var(--green)' : 'transparent',
                  color: d.done ? '#fff' : 'var(--ink)',
                  border: d.done ? 'none' : `1.5px solid ${d.isToday ? 'var(--ink)' : 'var(--line)'}`,
                }}
              >
                {d.label.charAt(0)}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--green-soft)', borderRadius: 'var(--radius-card)', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cenário de hoje</span>
              <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                {activeScenario ? `${activeScenario.title} · ${activeScenario.subtitle || ''}` : 'Nenhum cenário selecionado ainda'}
              </p>
            </div>
            <ScenarioSwitcher scenarios={MOCK_SCENARIOS} activeScenarioId={profile.active_scenario_id} extraTopics={['viagem']} />
          </div>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px', color: 'var(--ink)' }}>O que vamos praticar hoje?</h2>
        <div className="web-grid-2">
          <div className="v2-card-dark" style={{ display: 'flex', alignItems: 'center', gap: 14, height: '100%' }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>W</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 16 }}>Writing</strong>
                <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 11, opacity: 0.7 }}>~{Math.max(1, Math.round(writingExercises.length * 1.3))} min</span>
              </div>
              <p style={{ margin: '2px 0 8px', fontSize: 13, opacity: 0.75 }}>Responda um cenário por escrito, digitando</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, borderRadius: 999, padding: '3px 9px', background: 'rgba(255,255,255,0.16)' }}>{writingExercises.length} atividades</span>
                <span style={{ fontSize: 11, borderRadius: 999, padding: '3px 9px', background: 'rgba(62,155,95,0.35)' }}>2 para revisar</span>
              </div>
            </div>
            <span style={{ fontSize: 20, opacity: 0.7, flexShrink: 0 }}>→</span>
          </div>

          <div className="v2-card-green" style={{ display: 'flex', alignItems: 'center', gap: 14, height: '100%' }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: 'var(--ink)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>S</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 16 }}>Speaking</strong>
                <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 11, opacity: 0.8 }}>~{Math.max(1, Math.round(speakingExercises.length * 1.3))} min</span>
              </div>
              <p style={{ margin: '2px 0 8px', fontSize: 13, opacity: 0.85 }}>Responda um cenário falando no microfone</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, borderRadius: 999, padding: '3px 9px', background: 'rgba(255,255,255,0.22)' }}>{speakingExercises.length} atividades</span>
              </div>
            </div>
            <span style={{ fontSize: 20, opacity: 0.85, flexShrink: 0 }}>→</span>
          </div>
        </div>
      </div>

      <div className="web-cols">
        <div>
          <div className="v2-section-head" style={{ marginBottom: 12 }}>
            <h2>Suas frases</h2>
            <span className="v2-section-right">{MOCK_DUE_PHRASES.length} para hoje</span>
          </div>

          <div style={{ background: 'var(--green-soft)', borderRadius: 16, padding: 14, marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)' }}>
              Você errou <strong style={{ color: 'var(--green-dark)' }}>{MOCK_TOP_ERROR_BANNER.label}</strong> {MOCK_TOP_ERROR_BANNER.count}x nos últimos 3 dias — as frases abaixo treinam exatamente isso.
            </p>
          </div>

          <div className="web-grid-2">
            {MOCK_DUE_PHRASES.map((item) => (
              <div key={item.id} className="v2-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.content?.forma_natural || item.pattern}
                  </strong>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.content?.dica || ''}
                  </span>
                </div>
                <PlayButton
                  text={item.content?.forma_natural || item.pattern}
                  accent={accent}
                  rate={rate}
                  label="▶"
                  style={{ background: 'var(--green-soft)', color: 'var(--green-dark)' }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="web-sticky" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="v2-card-dark">
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Frase do dia · {MOCK_CONTENT.phrase_of_day.context_label}
            </span>
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>{MOCK_CONTENT.phrase_of_day.en}</p>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{MOCK_CONTENT.phrase_of_day.explain_pt}</p>
            <PlayButton text={MOCK_CONTENT.phrase_of_day.en} accent={accent} rate={rate} />
          </div>

          <div className="v2-card" style={{ borderLeft: '4px solid var(--green)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Sua última correção
            </span>
            <p style={{ margin: 0, fontSize: 15 }}>
              <span style={{ color: 'var(--red)', textDecoration: 'line-through' }}>{MOCK_LAST_ERROR.wrong_text}</span>
              {' → '}
              <strong style={{ color: 'var(--green-dark)' }}>{MOCK_LAST_ERROR.right_text}</strong>
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{MOCK_LAST_ERROR.detail_pt}</p>
          </div>
        </div>
      </div>
    </>
  );
}

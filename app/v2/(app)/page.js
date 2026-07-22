import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { getOrCreateDailyContent } from '../../../lib/dailyContent';
import { dayKeySP, weekStartSP, weekEndSP, addDays, todayKeySP } from '../../../lib/dates';
import { computeScenarioStatuses } from '../../../lib/scenarioProgress';
import { AppHeader } from '../../../components/ui';
import { ScenarioSwitcher } from '../../../components/v2/ScenarioSwitcher';

const WEEKDAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']; // segunda -> domingo

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()),
  );
  if (hour < 12) return 'Bom dia! Vamos praticar?';
  if (hour < 18) return 'Boa tarde! Vamos praticar?';
  return 'Boa noite! Vamos praticar?';
}

export default async function HojePageV2() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Todas as consultas abaixo só dependem de user.id/datas já calculáveis
  // (nenhuma depende do resultado de outra) — antes rodavam uma de cada vez,
  // cada uma pagando seu próprio round-trip ao Supabase em sequência; juntar
  // num Promise.all só faz a página esperar pela mais lenta, não pela soma
  // de todas. Isso inclui getOrCreateDailyContent, que na pior hipótese (sem
  // cache do dia) chama a Claude API — de longe o item mais lento da lista,
  // então tirá-lo da fila sequencial é o que mais pesa no tempo de carga.
  const now = new Date();
  const nowIso = now.toISOString();
  const weekStart = weekStartSP(now);

  const [
    profileRes,
    scenariosRes,
    stateRowsRes,
    themeRowsRes,
    content,
    dueForBadgesRes,
    weekSessionsRes,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url, streak_count, streak_shields, weekly_cadence_target, active_scenario_id, voice_accent, audio_speed')
      .eq('id', user.id)
      .single(),
    supabase.from('scenarios').select('*').order('stage', { ascending: true }),
    supabase.from('user_scenario_state').select('scenario_id, mastered_count, status').eq('user_id', user.id),
    supabase.from('user_theme_selection').select('track_id').eq('user_id', user.id),
    getOrCreateDailyContent(supabase, user).catch(() => ({ phrase_of_day: null, exercises: { writing: [], speaking: [] } })),
    supabase.from('review_items').select('id, skill').eq('user_id', user.id).eq('mastered', false).lte('next_review_at', nowIso),
    supabase.from('sessions').select('started_at').eq('user_id', user.id).gte('started_at', weekStart.toISOString()).lte('started_at', weekEndSP(now).toISOString()),
  ]);

  const profile = profileRes.data;
  const scenarios = scenariosRes.data;
  const stateRows = stateRowsRes.data;
  const themeRows = themeRowsRes.data;
  const dueForBadges = dueForBadgesRes.data;
  const weekSessions = weekSessionsRes.data;

  const stateByScenarioId = {};
  (stateRows || []).forEach((row) => {
    stateByScenarioId[row.scenario_id] = { masteredCount: row.mastered_count };
  });
  const computedStatuses = computeScenarioStatuses(scenarios || [], stateByScenarioId);
  const scenariosWithStatus = (scenarios || []).map((s) => ({ ...s, status: computedStatuses[s.id]?.status || 'locked' }));
  const activeScenario = scenariosWithStatus.find((s) => s.id === profile?.active_scenario_id) || null;
  const extraTopics = (themeRows || []).map((r) => r.track_id);

  const writingExercises = content.exercises?.writing || [];
  const speakingExercises = content.exercises?.speaking || [];

  const dueWritingCount = (dueForBadges || []).filter((i) => i.skill === 'writing').length;
  const dueSpeakingCount = (dueForBadges || []).filter((i) => i.skill === 'speaking').length;

  // 2. Meta semanal — 7 bolinhas segunda->domingo
  const daysWithSession = new Set((weekSessions || []).map((s) => dayKeySP(new Date(s.started_at))));
  const todayKey = todayKeySP();
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const key = dayKeySP(date);
    return { key, label: WEEKDAY_LABELS[i], done: daysWithSession.has(key), isToday: key === todayKey };
  });
  const weeklyGoal = profile?.weekly_cadence_target || 5;

  return (
    <>
      {/* 1. Cabeçalho — no mobile, AppHeader (logo+streak+avatar) já que não
          há sidebar; no desktop essas infos já vivem na sidebar, então aqui
          vira só a saudação grande. Troca 100% via CSS (.mobile-only /
          .desktop-only em globals.css), sem detecção de viewport em JS. */}
      <div className="mobile-only">
        <AppHeader
          streak={profile?.streak_count || 0}
          streakShields={profile?.streak_shields || 0}
          avatarUrl={profile?.avatar_url}
          avatarInitial={profile?.full_name || user.email}
        />
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{getGreeting()}</p>
      </div>
      <div className="desktop-only">
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', margin: 0, color: 'var(--ink)' }}>{getGreeting()}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-soft)' }}>
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })}
        </p>
      </div>

      {/* 2. Meta semanal + 6. Cenário de hoje — lado a lado em telas largas */}
      <div className="web-grid-2">
        <div className="v2-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Meta semanal</span>
            <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 12.5, color: 'var(--ink)' }}>
              {daysWithSession.size}/{weeklyGoal} esta semana
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {weekDots.map((d) => (
              <div
                key={d.key}
                title={d.key}
                style={{
                  flex: 1, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
                  background: d.done ? 'var(--green)' : 'transparent',
                  color: d.done ? '#fff' : 'var(--ink)',
                  border: d.done ? 'none' : `1.5px solid ${d.isToday ? 'var(--ink)' : 'var(--line)'}`,
                }}
              >
                {d.label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--green-soft)', borderRadius: 'var(--radius-card)', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cenário de hoje</span>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                {activeScenario ? `${activeScenario.title} · ${activeScenario.subtitle || ''}` : 'Nenhum cenário selecionado ainda'}
              </p>
            </div>
            <ScenarioSwitcher scenarios={scenariosWithStatus} activeScenarioId={profile?.active_scenario_id} extraTopics={extraTopics} />
          </div>
        </div>
      </div>

      {/* 3 */}
      <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--ink)' }}>O que vamos praticar hoje?</h1>

      {/* 4/5. Writing + Speaking — lado a lado em telas largas */}
      <div className="web-grid-2">
        <Link href="/v2/praticar/writing" style={{ textDecoration: 'none' }}>
          <div className="v2-card-dark" style={{ display: 'flex', alignItems: 'center', gap: 14, height: '100%' }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>W</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 16 }}>Writing</strong>
                <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 11, opacity: 0.7 }}>~{Math.max(1, Math.round(writingExercises.length * 1.3))} min</span>
              </div>
              <p style={{ margin: '2px 0 8px', fontSize: 13, opacity: 0.75 }}>Responda um cenário por escrito</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, borderRadius: 999, padding: '3px 9px', background: 'rgba(255,255,255,0.16)' }}>{writingExercises.length} atividades de escrita</span>
                {dueWritingCount > 0 && (
                  <span style={{ fontSize: 11, borderRadius: 999, padding: '3px 9px', background: 'rgba(62,155,95,0.35)' }}>{dueWritingCount} para revisar</span>
                )}
              </div>
            </div>
            <span style={{ fontSize: 20, opacity: 0.7, flexShrink: 0 }}>→</span>
          </div>
        </Link>

        <Link href="/v2/praticar/speaking" style={{ textDecoration: 'none' }}>
          <div className="v2-card-green" style={{ display: 'flex', alignItems: 'center', gap: 14, height: '100%' }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: 'var(--ink)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>S</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 16 }}>Speaking</strong>
                <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 11, opacity: 0.8 }}>~{Math.max(1, Math.round(speakingExercises.length * 1.3))} min</span>
              </div>
              <p style={{ margin: '2px 0 8px', fontSize: 13, opacity: 0.85 }}>Responda um cenário falando</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, borderRadius: 999, padding: '3px 9px', background: 'rgba(255,255,255,0.22)' }}>{speakingExercises.length} atividades de fala</span>
                {dueSpeakingCount > 0 && (
                  <span style={{ fontSize: 11, borderRadius: 999, padding: '3px 9px', background: 'rgba(20,20,18,0.28)' }}>{dueSpeakingCount} para revisar</span>
                )}
              </div>
            </div>
            <span style={{ fontSize: 20, opacity: 0.85, flexShrink: 0 }}>→</span>
          </div>
        </Link>
      </div>
    </>
  );
}

import { createClient } from '../../../../lib/supabase/server';
import { SectionHead } from '../../../../components/ui';
import { AjustesClient } from '../../../../components/v2/AjustesClient';
import { computeGamification } from '../../../../lib/gamification';
import { streakFromDayKeys } from '../../../../lib/streak';
import { dayKeySP, weekStartSP, addDays, todayKeySP } from '../../../../lib/dates';
import { hasPasswordFor } from '../../../../lib/passwordAccount';
import { identidade, perfilV2, diasComSessao } from '../../../../lib/sessaoServidor';

// Aba Perfil (antiga Ajustes): a gamificação (patente/XP/missões) mora aqui + o
// perfil e as configurações.
export default async function AjustesPageV2() {
  const supabase = createClient();

  const now = new Date();
  const todayKey = todayKeySP();
  const weekStart = weekStartSP(now);
  const weekKeys = new Set(Array.from({ length: 7 }, (_, i) => dayKeySP(addDays(weekStart, i))));

  /* Esta era a tela mais lenta do app: SEIS consultas em fila indiana, cada
     uma esperando a anterior sem precisar — nenhuma delas usa o resultado da
     outra. Em fila, o tempo é a SOMA; juntas, é a mais lenta.

     `identidade`, `perfilV2` e `diasComSessao` não custam ida à rede aqui: o
     layout acima já pediu as mesmas coisas e o cache de requisição as devolve
     prontas. Sobram três consultas de verdade, e elas vão juntas. */
  const eu = await identidade();
  const [profile, { dias: doneSet, inicios }, hasPassword, up, cl] = await Promise.all([
    perfilV2(),
    diasComSessao(),
    // Separada de propósito: se a migration 0033 ainda não rodou, devolve false
    // em vez de derrubar o select do perfil.
    hasPasswordFor(supabase, eu),
    supabase.from('unit_progress').select('unit_id, completed_at').eq('user_id', eu.id),
    supabase.from('review_saved').select('id', { count: 'exact', head: true }).eq('user_id', eu.id).eq('status', 'learned'),
  ]);

  // ---- Gamificação (derivada dos dados; best-effort se tabelas faltarem) ----
  const streak = streakFromDayKeys(doneSet, todayKey);
  const sessAll = inicios;
  const sessionsThisWeek = sessAll.filter((iso) => weekKeys.has(dayKeySP(new Date(iso)))).length;
  const daysThisWeek = Array.from(weekKeys).filter((k) => doneSet.has(k)).length;

  let completedIds = [];
  let unitsThisWeek = 0;
  if (up.data) {
    completedIds = up.data.map((r) => r.unit_id);
    unitsThisWeek = up.data.filter((r) => r.completed_at && weekKeys.has(dayKeySP(new Date(r.completed_at)))).length;
  }
  const cardsLearned = typeof cl.count === 'number' ? cl.count : 0;

  const game = computeGamification({
    completedIds,
    sessionsTotal: sessAll.length,
    sessionsThisWeek,
    cardsLearned,
    streak,
    unitsThisWeek,
    daysThisWeek,
    weeklyGoal: profile?.weekly_cadence_target || 5,
  });

  return (
    <div className="web-narrow" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead title="Perfil" />
      <AjustesClient profile={profile} email={eu?.email || ''} game={game} hasPassword={hasPassword} />
    </div>
  );
}

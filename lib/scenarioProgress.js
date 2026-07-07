// Progressão do catálogo novo de cenários (scenarios / user_scenario_state,
// migration 0005) — separada da progressão de trilha/estágio já existente
// (lib/tracks.js + stage_completions via boss scenarios). Os dois sistemas
// coexistem por enquanto; nada aqui substitui lib/srs.js, que continua
// sendo a fonte de verdade do intervalo 0/1/7/30 dos review_items.
//
// Funções puras (sem I/O) — quem chama decide como ler/persistir no
// Supabase, igual ao padrão já usado em lib/srs.js e lib/session.js.

const UNLOCK_RATIO = 0.7;

// Chame depois que um review_item vinculado a um scenario_id virar mastered
// (a progressão 0/1/7/30 em si já é resolvida por computeReviewOutcome, em
// lib/srs.js — isto só soma o cenário e decide se libera o próximo).
export function applyScenarioMastery({ masteredCount = 0, targetPhrases, justMastered }) {
  const nextMasteredCount = justMastered ? masteredCount + 1 : masteredCount;
  const ratio = targetPhrases > 0 ? nextMasteredCount / targetPhrases : 0;
  return {
    masteredCount: nextMasteredCount,
    ratio,
    shouldUnlockNext: ratio >= UNLOCK_RATIO,
  };
}

// Recalcula o status (locked/current/done) de toda a trilha de cenários a
// partir do estado agregado de cada um — sempre determinístico, nunca
// depende de qual foi "o último evento", só do estado atual.
export function computeScenarioStatuses(scenarios, stateByScenarioId = {}) {
  const sorted = [...scenarios].sort((a, b) => a.stage - b.stage);
  const result = {};
  let previousUnlocked = true; // o primeiro da trilha sempre começa liberado

  sorted.forEach((scenario) => {
    const state = stateByScenarioId[scenario.id] || { masteredCount: 0 };
    const ratio = scenario.target_phrases > 0 ? state.masteredCount / scenario.target_phrases : 0;
    const status = !previousUnlocked ? 'locked' : ratio >= 1 ? 'done' : 'current';

    result[scenario.id] = { masteredCount: state.masteredCount, ratio, status };
    previousUnlocked = ratio >= UNLOCK_RATIO;
  });

  return result;
}

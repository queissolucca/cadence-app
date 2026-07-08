// Progressão do catálogo novo de cenários (scenarios / user_scenario_state,
// migration 0005) — separada da progressão de trilha/estágio já existente
// (lib/tracks.js + stage_completions via boss scenarios). Os dois sistemas
// coexistem por enquanto; nada aqui substitui lib/srs.js, que continua
// sendo a fonte de verdade do intervalo 0/1/7/30 dos review_items.
//
// Funções puras (sem I/O) — quem chama decide como ler/persistir no
// Supabase, igual ao padrão já usado em lib/srs.js e lib/session.js.

const UNLOCK_RATIO = 0.7;

// Quantos cenários já começam liberados, todos ao mesmo tempo e
// selecionáveis livremente — não é mais uma trilha sequencial (cadeia
// "domina 70% do atual pra liberar o próximo"). O objetivo agora é focar o
// aluno em alguns contextos específicos primeiro, sem forçar uma ordem de
// progressão fixa dentro deles.
const DEFAULT_UNLOCKED_COUNT = 3;

// Mantido por compatibilidade com app/api/evaluate's bumpScenarioMastery —
// ratio/masteredCount ainda alimentam a barra de progresso e o "dominado"
// de cada cenário. shouldUnlockNext não tem mais efeito visível (não existe
// mais "próximo da cadeia" pra liberar), mas manter o cálculo é inofensivo.
export function applyScenarioMastery({ masteredCount = 0, targetPhrases, justMastered }) {
  const nextMasteredCount = justMastered ? masteredCount + 1 : masteredCount;
  const ratio = targetPhrases > 0 ? nextMasteredCount / targetPhrases : 0;
  return {
    masteredCount: nextMasteredCount,
    ratio,
    shouldUnlockNext: ratio >= UNLOCK_RATIO,
  };
}

// Recalcula o status (locked/current/done) de cada cenário — sempre
// determinístico, nunca depende de eventos passados, só do estado atual.
// Os primeiros DEFAULT_UNLOCKED_COUNT (por ordem de stage) ficam
// liberados de forma independente uma da outra; o aluno escolhe livremente
// qual praticar entre eles (ver ScenarioTrail/ScenarioSwitcher). O restante
// fica bloqueado — sem mecanismo de desbloqueio automático por enquanto.
export function computeScenarioStatuses(scenarios, stateByScenarioId = {}) {
  const sorted = [...scenarios].sort((a, b) => a.stage - b.stage);
  const result = {};

  sorted.forEach((scenario, idx) => {
    const state = stateByScenarioId[scenario.id] || { masteredCount: 0 };
    const ratio = scenario.target_phrases > 0 ? state.masteredCount / scenario.target_phrases : 0;
    const unlocked = idx < DEFAULT_UNLOCKED_COUNT;
    const status = !unlocked ? 'locked' : ratio >= 1 ? 'done' : 'current';

    result[scenario.id] = { masteredCount: state.masteredCount, ratio, status };
  });

  return result;
}

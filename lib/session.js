import { getStage } from './tracks';

export const SESSION_SIZE = 6;

function pickScenario(stageDef, skill, usedIds) {
  if (!stageDef) return null;
  const pool = (stageDef.scenarios[skill] || []).filter((s) => !usedIds.has(s.id));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Monta a sessão do dia: ~40% revisão SRS vencida, ~40% prática deliberada
// (cenário novo forçando um erro ativo do usuário), ~20% material novo da
// trilha, sem restrição (§2.2 do prompt mestre).
export function composeSession(ledger, track, stage) {
  const now = Date.now();
  const active = ledger.filter((it) => !it.mastered);
  const due = active.filter((it) => it.due <= now).sort((a, b) => a.due - b.due);
  const notDue = active.filter((it) => it.due > now).sort((a, b) => b.taxaErro - a.taxaErro);

  const reviewCount = Math.min(Math.round(SESSION_SIZE * 0.4), due.length);
  const deliberatePool = [...due.slice(reviewCount), ...notDue];
  const deliberateCount = Math.min(Math.round(SESSION_SIZE * 0.4), deliberatePool.length);
  const newCount = SESSION_SIZE - reviewCount - deliberateCount;

  const stageDef = getStage(track, stage);
  const usedIds = new Set();
  const queue = [];

  due.slice(0, reviewCount).forEach((item) => {
    const scenario = pickScenario(stageDef, item.skill, usedIds);
    if (!scenario) return;
    usedIds.add(scenario.id);
    queue.push({
      kind: 'review',
      skill: item.skill,
      scenario,
      restriction: { patternId: item.id, structureHint: item.dica || item.pattern },
      reviewItemId: item.id,
    });
  });

  deliberatePool.slice(0, deliberateCount).forEach((item) => {
    const scenario = pickScenario(stageDef, item.skill, usedIds);
    if (!scenario) return;
    usedIds.add(scenario.id);
    queue.push({
      kind: 'deliberate',
      skill: item.skill,
      scenario,
      restriction: { patternId: item.id, structureHint: item.dica || item.pattern },
      reviewItemId: null,
    });
  });

  for (let i = 0; i < newCount; i += 1) {
    const skill = i % 2 === 0 ? 'writing' : 'speaking';
    const scenario = pickScenario(stageDef, skill, usedIds);
    if (!scenario) continue;
    usedIds.add(scenario.id);
    queue.push({ kind: 'new', skill, scenario, restriction: null, reviewItemId: null });
  }

  return queue;
}

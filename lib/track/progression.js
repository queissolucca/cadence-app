import { LEVELS, getLevel } from './cefr';

// Progressão pura (sem DB) — mesma pegada de lib/streak.js e lib/srs.js.
// Consome um mapa de domínio `masteryById: { [structureId]: correctUses }`,
// alimentado pela análise pós-chamada (Fase 3), e diz onde o aluno está e qual
// estrutura treinar a seguir.

// Quantos usos corretos, em sessões distintas, contam uma estrutura como
// "dominada". Baixo de propósito: a graça é rever espaçado, não grindar.
export const MASTERY_THRESHOLD = 3;

export function isMastered(masteryById, structureId) {
  return (masteryById?.[structureId] || 0) >= MASTERY_THRESHOLD;
}

// O nível atual é o mais baixo que ainda tem estrutura pra dominar. Você "está"
// num nível enquanto não zerou ele; sobe quando domina o nível inteiro.
export function currentLevel(masteryById = {}) {
  for (const level of LEVELS) {
    const allMastered = level.grammar.every((g) => isMastered(masteryById, g.id));
    if (!allMastered) return level;
  }
  return LEVELS[LEVELS.length - 1]; // tudo dominado → topo (C2)
}

// Progresso 0..1 dentro de um nível (quantas estruturas já dominadas).
export function levelProgress(masteryById = {}, levelCode) {
  const level = getLevel(levelCode);
  if (!level) return 0;
  const done = level.grammar.filter((g) => isMastered(masteryById, g.id)).length;
  return done / level.grammar.length;
}

// Progresso 0..1 na trilha inteira (A1→C2).
export function overallProgress(masteryById = {}) {
  const total = LEVELS.reduce((n, l) => n + l.grammar.length, 0);
  const done = LEVELS.reduce(
    (n, l) => n + l.grammar.filter((g) => isMastered(masteryById, g.id)).length,
    0,
  );
  return total ? done / total : 0;
}

// Escolhe a estrutura-alvo da próxima sessão: primeiro uma revisão espaçada
// vencida (pra fixar), senão a próxima estrutura ainda não dominada do nível.
// `dueReviews`: structureIds vencidos vindos do SRS, mais urgentes primeiro.
export function nextTargetStructure(masteryById = {}, dueReviews = []) {
  const level = currentLevel(masteryById);

  const dueHere = dueReviews.find((id) => level.grammar.some((g) => g.id === id));
  if (dueHere) {
    const g = level.grammar.find((x) => x.id === dueHere);
    return { ...g, level: level.code, reason: 'review' };
  }

  const fresh = level.grammar.find((g) => !isMastered(masteryById, g.id));
  if (fresh) return { ...fresh, level: level.code, reason: 'new' };

  // Nível inteiro dominado → primeira estrutura do próximo nível.
  const next = LEVELS[level.order + 1];
  if (next) return { ...next.grammar[0], level: next.code, reason: 'new' };

  // Topo da trilha: mantém em circulação.
  return { ...level.grammar[0], level: level.code, reason: 'maintenance' };
}

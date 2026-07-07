// Patentes de habilidade — calculadas dos 4 eixos da rubrica acumulados em
// skill_progress, nunca de um rótulo genérico tipo CEFR. Subir de patente
// exige domínio comprovado ao longo do tempo (os eixos só sobem quando uma
// correção realmente evidencia aquele eixo), não volume de exercícios.
export const PATENT_TIERS = ['Entendível', 'Claro', 'Natural', 'Afiado'];

export function computePatent(progress) {
  if (!progress) return PATENT_TIERS[0];
  const avg = ((progress.precisao || 0) + (progress.naturalidade || 0) + (progress.vocabulario || 0) + (progress.fluencia || 0)) / 4;
  if (avg >= 80) return 'Afiado';
  if (avg >= 60) return 'Natural';
  if (avg >= 40) return 'Claro';
  return 'Entendível';
}

export function clampAxis(value) {
  return Math.max(0, Math.min(100, value));
}

// Patente v2 (aba Progresso) — por CONTAGEM de frases mastered no modo,
// não pela rubrica de 4 eixos acima (skill_progress não é usado pelo
// shell novo em /v2). Sistema separado, coexistindo de propósito.
const COUNT_LEVELS = [
  { min: 0, max: 4, label: 'Iniciante' },
  { min: 5, max: 14, label: 'Entendível' },
  { min: 15, max: 29, label: 'Claro' },
  { min: 30, max: 59, label: 'Natural' },
  { min: 60, max: Infinity, label: 'Fluente' },
];

export function computePatentByCount(masteredCount) {
  const idx = COUNT_LEVELS.findIndex((l) => masteredCount >= l.min && masteredCount <= l.max);
  const level = COUNT_LEVELS[Math.max(0, idx)];
  const next = COUNT_LEVELS[idx + 1] || null;
  return {
    label: level.label,
    nextLabel: next?.label || null,
    remaining: next ? next.min - masteredCount : 0,
    progressPct: next ? Math.round(((masteredCount - level.min) / (next.min - level.min)) * 100) : 100,
  };
}

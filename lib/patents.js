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

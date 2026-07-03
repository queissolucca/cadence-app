// Leitner simplificado: estágio 0 (hoje) → 1 (+1 dia) → 2 (+7 dias) → 3 (+30 dias).
// Um item só é "dominado" quando já estava no estágio 3 e é revisado com sucesso
// de novo — ou seja, precisa passar pela revisão de 30 dias, não só chegar nela.
export const SRS_SCHEDULE_DAYS = [0, 1, 7, 30];

export function computeReviewOutcome(currentStage, correct) {
  if (!correct) {
    return { stage: 0, mastered: false, dueInDays: SRS_SCHEDULE_DAYS[0] };
  }

  const lastStage = SRS_SCHEDULE_DAYS.length - 1;
  if (currentStage >= lastStage) {
    // já estava em "1 mês" e acertou de novo -> dominado
    return { stage: lastStage, mastered: true, dueInDays: null };
  }

  const stage = currentStage + 1;
  return { stage, mastered: false, dueInDays: SRS_SCHEDULE_DAYS[stage] };
}

export function nextReviewDate(dueInDays) {
  if (dueInDays === null) {
    // item dominado: não entra mais na fila normal de revisão diária.
    return new Date(Date.now() + 365 * 86400000);
  }
  return new Date(Date.now() + dueInDays * 86400000);
}

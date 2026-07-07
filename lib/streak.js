import { dayKeySP, daysBetweenSP } from './dates';

// Streak incremental com "shields" — camada nova, opera sobre
// profiles.streak_count/streak_last_day/streak_shields (migration 0005).
// Coexiste com o cálculo já existente em lib/week.js (que deriva streak
// semanal a partir do histórico de exercise_attempts, sem persistir nada
// incremental) — nenhum dos dois substitui o outro nesta fase.
//
// Nota de interpretação: a régua original tinha "== ontem" e "gap de
// exatamente 1 dia" como duas condições separadas, o que se sobrepõe (== a
// ontem já É um gap de 1 dia). Assumi que o shield entra quando falta
// exatamente 1 dia NO MEIO (gap de 2 dias entre a última sessão e hoje) —
// é a única leitura em que "shield salva a sequência" faz sentido. Ajusta
// se a intenção era outra.
export function completeSessionToday({ streakCount = 0, streakLastDay, streakShields = 0 }, now = new Date()) {
  const today = dayKeySP(now);

  if (streakLastDay === today) {
    return { streakCount, streakLastDay: today, streakShields, changed: false };
  }

  const gap = streakLastDay ? daysBetweenSP(streakLastDay, today) : null;

  if (gap === 1) {
    return { streakCount: streakCount + 1, streakLastDay: today, streakShields, changed: true };
  }

  if (gap === 2 && streakShields > 0) {
    return { streakCount: streakCount + 1, streakLastDay: today, streakShields: streakShields - 1, changed: true };
  }

  return { streakCount: 1, streakLastDay: today, streakShields, changed: true };
}

// Ao bater a meta semanal, ganha 1 shield — máximo 2 acumulados. Só no dia
// em que a contagem de dias da semana atinge EXATAMENTE a meta (não toda
// vez que weekSessionDays >= weeklyGoal): como dias distintos só sobem de 1
// em 1, esse dia sempre existe e é único por semana — sem essa checagem,
// toda sessão feita depois de já ter batido a meta ganharia shield de novo
// até estourar o cap, numa única semana.
export function maybeAwardShield({ streakShields = 0 }, weekSessionDays, weeklyGoal) {
  if (weekSessionDays !== weeklyGoal) return { streakShields, awarded: false };
  const next = Math.min(streakShields + 1, 2);
  return { streakShields: next, awarded: next > streakShields };
}

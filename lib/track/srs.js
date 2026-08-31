// Repetição espaçada estilo Leitner pra aba Revisão.
// 5 caixas: item entra na 1 (revisa hoje). Acertou sobe de caixa (intervalo
// maior); errou volta pra 1. Ao chegar na caixa 5 o item "gradua" (status
// learned) e sai da lista de ativos sozinho — sem acumular infinito.
//
import { dayKeySP, addDaysKey, brasiliaDayStartISO } from '../dates';

// Intervalo até a próxima revisão, por caixa (em dias). Caixa 1 = hoje.
const INTERVAL_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7 };
const GRADUATE_BOX = 5;

// Dado a caixa atual e a nota do flashcard, devolve o novo estado.
//   rating: 'again' (errou) | 'good' (acertou) | 'easy' (fácil, pula uma caixa)
// O due_at é ancorado às 00:01 de Brasília do dia-alvo — assim a revisão do dia
// "reseta" todo dia às 00:01 (GMT-3), não em janelas de 24h rolantes.
export function nextState(box, rating) {
  const b = Number(box) > 0 ? Number(box) : 1;
  let nb;
  if (rating === 'again') nb = 1;
  else if (rating === 'easy') nb = b + 2;
  else nb = b + 1; // 'good'

  if (nb >= GRADUATE_BOX) {
    return { box: GRADUATE_BOX, status: 'learned', graduated: true };
  }
  const days = INTERVAL_DAYS[nb] ?? 0;
  const dueKey = addDaysKey(dayKeySP(new Date()), days);
  return {
    box: nb,
    status: 'active',
    graduated: false,
    due_at: brasiliaDayStartISO(dueKey),
  };
}

// Quantas "bolinhas" preenchidas mostrar (progresso rumo à graduação): 0–4.
export function boxProgress(box) {
  const b = Number(box) > 0 ? Number(box) : 1;
  return Math.max(0, Math.min(GRADUATE_BOX - 1, b - 1));
}

export const SRS_STEPS = GRADUATE_BOX - 1; // 4 passos até graduar

// Um item está "vencido" (aparece em Revisar hoje) se está ativo e a data de
// revisão já passou (ou nem existe ainda).
export function isDue(item, now = Date.now()) {
  if (!item || item.status === 'learned') return false;
  if (!item.due_at) return true;
  const t = new Date(item.due_at).getTime();
  return Number.isNaN(t) ? true : t <= now;
}

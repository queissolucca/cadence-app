// Mapeia uma linha de review_items (Supabase) para o formato usado pela UI —
// o "Perfil de Erros" (§3.2).
export function mapLedgerItem(row) {
  const c = row.content || {};
  return {
    id: row.id,
    skill: row.skill,
    pattern: row.pattern || '',
    categoria: c.categoria || '',
    formaNatural: c.forma_natural || '',
    porque: c.porque || '',
    dica: c.dica || '',
    exemplos: c.exemplos_do_usuario || [],
    stage: row.stage,
    mastered: row.mastered,
    due: row.next_review_at ? new Date(row.next_review_at).getTime() : Date.now(),
    timesSeen: row.times_seen || 0,
    timesCorrect: row.times_correct || 0,
    taxaErro: row.times_seen > 0 ? 1 - row.times_correct / row.times_seen : 1,
  };
}

// status: ativo (acabou de entrar/reiniciar) → em_revisao (ciclando no SRS)
// → dominado (passou pela revisão de 30 dias com sucesso).
export function ledgerStatus(item) {
  if (item.mastered) return 'dominado';
  if (item.stage === 0) return 'ativo';
  return 'em_revisao';
}

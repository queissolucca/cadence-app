// Gera localmente (sem chamada de IA) o enunciado de um item de revisão a
// partir do que já está salvo no review_item — pede pro aluno PRODUZIR uma
// frase nova aplicando o mesmo padrão, em vez de só reler a correção antiga.
export function buildReviewPrompt(item) {
  const tip = item.content?.dica || item.content?.categoria || 'esse padrão';
  return `Escreva uma frase nova em inglês aplicando: ${tip}`;
}

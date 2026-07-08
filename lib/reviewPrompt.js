// Gera localmente (sem chamada de IA) o enunciado de um item de revisão a
// partir do que já está salvo no review_item — pede pro aluno PRODUZIR uma
// frase nova aplicando o mesmo padrão, em vez de só reler a correção antiga.
//
// Cascata de fallback: alguns review_items mais antigos (criados antes desta
// correção) podem ter content.dica/categoria vazios — em vez de cair num
// texto genérico tipo "esse padrão" (sem nenhum valor de aprendizagem), usa
// o que houver de mais concreto disponível no próprio item.
export function buildReviewPrompt(item) {
  const content = item.content || {};
  const tip =
    content.dica ||
    content.categoria ||
    (content.forma_natural && `algo como: "${content.forma_natural}"`) ||
    item.pattern ||
    'o padrão que você praticou da última vez';
  return `Escreva uma frase nova em inglês aplicando: ${tip}`;
}

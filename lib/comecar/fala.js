/* Comparação entre a frase pedida no teste de fala e o que a pessoa falou.

   Antes esta tela mostrava "pronúncia 92% · ritmo 78%" fixos no código, com a
   frase-alvo repetida como se fosse a transcrição. Era número inventado
   apresentado como medida da fala de quem estava ali. Aqui não tem nota: tem o
   que a Web Speech API ouviu e quais palavras da frase apareceram.

   Por que só palavras e não pronúncia: a Web Speech API devolve texto, não
   fonemas — ela não sabe dizer se o "th" saiu certo. Medir palavra é o que dá
   pra afirmar com honestidade a partir do que temos. */

export const FRASE_TESTE = 'I’d like a table for two, please.';

// O reconhecedor às vezes expande a contração: "I'd" volta como "I would".
// Chave = palavra da frase-alvo; valor = as palavras que, juntas, valem por ela.
const EQUIVALENTES = { id: ['i', 'would'] };

const normalizar = (s) => String(s || '')
  .toLowerCase()
  .replace(/[‘’']/g, '')      // apóstrofos retos e curvos
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter(Boolean);

export function compararFala(dito) {
  const alvo = normalizar(FRASE_TESTE);
  const disse = String(dito || '').trim();
  if (!disse) return { ouviu: false, disse: '', alvo, faltando: alvo, acertou: 0, completa: false };

  const ditas = new Set(normalizar(disse));
  // Sem o `!!eq`, `[].every(...)` devolve true e TODA palavra sem equivalente
  // cadastrado passaria como presente — a frase nunca teria o que faltar.
  const presente = (p) => {
    if (ditas.has(p)) return true;
    const eq = EQUIVALENTES[p];
    return !!eq && eq.every((e) => ditas.has(e));
  };

  const faltando = alvo.filter((p) => !presente(p));
  return {
    ouviu: true,
    disse,
    alvo,
    faltando,
    acertou: alvo.length - faltando.length,
    completa: faltando.length === 0,
  };
}

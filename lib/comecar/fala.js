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

/* Quem tocou em "não consigo falar agora". É diferente de não ter sido ouvido:
   um é escolha, o outro é falha. A tela de feedback precisa distinguir os dois
   — dizer "não consegui te ouvir" pra quem pulou de propósito soa como erro do
   app, e dizer "tudo bem, fica pra depois" pra quem tentou e não foi ouvido
   esconde um problema real de microfone. */
export const PULOU = '__pulou__';

export function compararFala(dito) {
  const alvo = normalizar(FRASE_TESTE);
  if (dito === PULOU) {
    return { ouviu: false, pulou: true, disse: '', alvo, faltando: alvo, acertou: 0, completa: false };
  }
  const disse = String(dito || '').trim();
  if (!disse) return { ouviu: false, pulou: false, disse: '', alvo, faltando: alvo, acertou: 0, completa: false };

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
    pulou: false,
    disse,
    alvo,
    faltando,
    acertou: alvo.length - faltando.length,
    completa: faltando.length === 0,
  };
}

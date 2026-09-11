/* O QUE A CADY JÁ GUARDOU — a linha de memória da tela de plano.

   No lugar dela havia "Meta: 1 de novembro · 52 dias de cadência", que é uma
   data calculada: o app dizendo uma coisa sobre si mesmo. A memória é o
   contrário — é o app repetindo o que a PESSOA disse, e é o diferencial que o
   produto vende (a Cady lembra dos seus gostos, objetivos e rotina sozinha, e
   personaliza a conversa com isso).

   Por que uma lista de fragmentos e não um texto com interpolação: no fim das
   33 telas nem toda resposta existe. Quem pula o modo dev, quem volta pelo
   Google no meio, quem tem localStorage de uma versão antiga do funil — todos
   chegam aqui com buracos. Uma frase montada com `${a.objetivo}` viraria
   "objetivo de undefined, 5 minutos por dia". Aqui cada pedaço só entra se
   tiver resposta, e a frase fecha bem com um, dois ou cinco pedaços.

   O teto de fragmentos existe porque o cartão tem duas linhas. Acima disso a
   frase vira parágrafo e deixa de ler como "ela reparou" pra ler como despejo
   de formulário. */

const OBJETIVOS = {
  Viagem: 'quer inglês pra viajar',
  Carreira: 'quer inglês pra carreira',
  Conversar: 'quer conversar sem travar',
  Prova: 'quer inglês pra prova',
};

const HORARIOS = {
  manha: 'de manhã',
  almoco: 'no almoço',
  noite: 'à noite',
  livre: 'sem hora fixa',
};

// Quantos pedaços cabem nas duas linhas do cartão.
const TETO = 4;

/* Junta em português: "a, b e c" — e não "a, b, c", que soa como etiqueta. */
function juntar(itens) {
  if (itens.length <= 1) return itens[0] || '';
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

export function resumoDaMemoria(a = {}) {
  const partes = [];

  if (OBJETIVOS[a?.objetivo]) partes.push(OBJETIVOS[a.objetivo]);

  if (a?.min) {
    const horario = HORARIOS[a?.horario];
    partes.push(`${a.min} minutos por dia${horario ? ` ${horario}` : ''}`);
  } else if (HORARIOS[a?.horario]) {
    partes.push(`treina ${HORARIOS[a.horario]}`);
  }

  const temas = Array.isArray(a?.temas) ? a.temas.filter(Boolean) : [];
  // Dois temas bastam pra provar que ela reparou; a lista inteira é despejo.
  if (temas.length) partes.push(`gosta de falar sobre ${juntar(temas.slice(0, 2)).toLowerCase()}`);

  if (a?.nivel === 'zero' || a?.hoje === '0') partes.push('quase não fala em voz alta hoje');

  // Sem nenhuma resposta ainda, a frase não pode mentir dizendo que guardou
  // algo — mas também não pode ficar vazia no meio do cartão.
  if (!partes.length) return 'vou guardando o que você me contar, conversa a conversa';

  const frase = juntar(partes.slice(0, TETO));
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

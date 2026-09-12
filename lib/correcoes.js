/* AS CORREÇÕES VIRAM CARD DEPOIS DA CONVERSA, NÃO DURANTE.

   Antes, a Cady chamava o client tool `save_to_review` sozinha a cada correção
   que fazia — estava escrito no system prompt dela. O card aparecia na hora, o
   que é ótimo; o preço é que estava no lugar mais caro possível.

   Uma chamada de ferramenta obriga o modelo a um passo a mais ANTES de abrir a
   boca: ele termina a resposta pedindo a ferramenta, o orquestrador despacha, e
   só então ele é chamado de novo pra gerar a fala. Isso acontecia justamente nos
   turnos de CORREÇÃO — os mais importantes do produto — e cada um deles pagava
   um silêncio a mais. É o oposto do que se quer: a hora em que a conversa
   precisa fluir é exatamente a hora em que ela engasgava.

   Aqui é uma chamada Haiku ÚNICA, depois da conversa acabar, lendo a
   transcrição inteira. Não atrasa nada — a pessoa já saiu — e enxerga mais que a
   Cady enxergava no meio da fala: o erro que se repetiu três vezes fica óbvio de
   fora, e não do lado de dentro do turno.

   O que se perde, e é honesto dizer: a Cady sabia o que tinha acabado de
   corrigir; um extrator precisa reconhecer pela transcrição. Em correção
   explícita ("it's 'I went', not 'I go'") ele acerta fácil; em ajuste sutil de
   naturalidade, erra mais. E o card não aparece mais durante a aula.

   O salvar POR PEDIDO ("save this") continua sendo ferramenta em tempo real: ele
   só acontece quando a pessoa pede, e aí o card na hora é a resposta ao pedido. */

import { callClaudeJSON } from './anthropic';

export const CATEGORIAS = ['correction', 'phrase', 'word'];

/* Teto por conversa. Sem ele, uma aula longa de iniciante despeja trinta cards
   de uma vez e a aba Revisão deixa de ser uma lista e vira um castigo. */
export const MAX_POR_CONVERSA = 6;

const ESQUEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string', description: 'The corrected / natural English form, short.' },
          example: { type: 'string', description: 'One short natural sentence using it.' },
          note: { type: 'string', description: 'What was wrong, in ONE short line, in Portuguese.' },
          category: { type: 'string', enum: CATEGORIAS },
        },
        required: ['term', 'example', 'note', 'category'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

const SISTEMA = [
  'You read the transcript of a spoken English lesson between a Brazilian learner and their teacher (Cady),',
  'and you pull out what belongs on the learner\'s review list.',
  '',
  'Pick, in this order of priority:',
  '1. REAL mistakes the teacher corrected — wrong tense/conjugation/agreement, constructions translated',
  '   from Portuguese, anything that blocked meaning. category "correction".',
  '2. Phrasings the teacher offered as more natural than what the learner said. category "phrase".',
  '3. New words or idioms the teacher taught in this conversation. category "word".',
  '',
  'Hard rules:',
  '- `term` is the CORRECT/natural English form, never the learner\'s mistake.',
  '- `example` is one short natural sentence using the term.',
  '- `note` says, in ONE short line in PORTUGUESE, what was wrong or why it matters.',
  '- Ignore filler slips, pronunciation, and anything the learner already got right.',
  '- Never repeat something already on the known list.',
  '- If a mistake shows up more than once, return it ONCE and say so in the note.',
  '- Quality over quantity. An empty list is a correct answer for a conversation with nothing to fix.',
].join('\n');

/* A transcrição como texto. O corte é pelo FIM: numa conversa longa, o trecho
   recente é o que ainda não virou card. */
export function transcricaoEmTexto(messages, teto = 6000) {
  const linhas = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && m.text)
    .map((m) => `${m.role === 'you' ? 'Student' : 'Teacher'}: ${m.text}`)
    .join('\n');
  return linhas.length > teto ? linhas.slice(-teto) : linhas;
}

/* Normaliza pra comparar termos: é o que impede o mesmo erro de virar três
   cards com pontuação diferente ao longo de três conversas. */
export const chaveDoTermo = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

export function filtrarNovos(items, termosConhecidos) {
  const vistos = new Set(termosConhecidos.map(chaveDoTermo).filter(Boolean));
  const saida = [];
  for (const it of Array.isArray(items) ? items : []) {
    const term = typeof it?.term === 'string' ? it.term.trim() : '';
    if (!term) continue;
    const chave = chaveDoTermo(term);
    if (!chave || vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push({
      term: term.slice(0, 200),
      example: typeof it.example === 'string' ? it.example.trim().slice(0, 400) : null,
      note: typeof it.note === 'string' ? it.note.trim().slice(0, 400) : null,
      category: CATEGORIAS.includes(it.category) ? it.category : 'phrase',
    });
    if (saida.length >= MAX_POR_CONVERSA) break;
  }
  return saida;
}

export async function extrairCorrecoes(supabase, user, messages) {
  if (!process.env.ANTHROPIC_API_KEY) return { added: 0 };

  const texto = transcricaoEmTexto(messages);
  // Conversa curta demais não tem o que corrigir — e chamar o modelo à toa em
  // toda abertura de 20 segundos é dinheiro jogado fora.
  if (texto.length < 200) return { added: 0 };

  const { data: existentes } = await supabase
    .from('review_saved')
    .select('term')
    .eq('user_id', user.id)
    .limit(500);
  const conhecidos = (existentes || []).map((r) => r.term);

  let resultado;
  try {
    resultado = await callClaudeJSON({
      system: SISTEMA,
      user: `Already on the review list (do not repeat):\n${conhecidos.map((t) => `- ${t}`).join('\n') || '(empty)'}\n\nTranscript:\n${texto}`,
      schema: ESQUEMA,
      maxTokens: 700,
      temperature: 0,
      meta: { supabase, userId: user.id, kind: 'review_extract' },
    });
  } catch {
    return { added: 0 };
  }

  const linhas = filtrarNovos(resultado?.items, conhecidos);
  if (!linhas.length) return { added: 0 };

  const { error } = await supabase
    .from('review_saved')
    .insert(linhas.map((l) => ({ user_id: user.id, ...l })));
  if (error) return { added: 0 };
  return { added: linhas.length };
}

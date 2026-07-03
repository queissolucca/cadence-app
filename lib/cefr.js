// Referência CEFR (Common European Framework of Reference for Languages).
// Can-do statements resumidos/adaptados do Global Scale do CEFR, usados como
// critério de avanço de nível e como alvo de competência de cada tarefa gerada.

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const CAN_DO_STATEMENTS = {
  writing: {
    A1: [
      'Consegue escrever uma mensagem curta e simples (ex: recado, cartão postal).',
      'Consegue preencher um formulário simples com dados pessoais.',
    ],
    A2: [
      'Consegue escrever notas e mensagens simples sobre necessidades imediatas.',
      'Consegue escrever uma carta pessoal simples, como um agradecimento.',
    ],
    B1: [
      'Consegue escrever textos simples e coesos sobre assuntos familiares ou de interesse pessoal.',
      'Consegue escrever uma carta pessoal descrevendo experiências e impressões.',
    ],
    B2: [
      'Consegue escrever textos claros e detalhados sobre uma variedade de assuntos.',
      'Consegue escrever um texto argumentativo defendendo ou contestando um ponto de vista.',
    ],
    C1: [
      'Consegue escrever textos claros, bem estruturados e detalhados sobre temas complexos.',
      'Consegue escrever um relatório ou email profissional destacando os pontos relevantes.',
    ],
    C2: [
      'Consegue escrever textos claros e fluentes em um estilo apropriado ao contexto.',
      'Consegue escrever um resumo ou resenha crítica de um texto complexo.',
    ],
  },
  speaking: {
    A1: [
      'Consegue interagir de forma simples desde que a outra pessoa fale devagar.',
      'Consegue fazer perguntas simples sobre necessidades imediatas (ex: onde fica, quanto custa).',
    ],
    A2: [
      'Consegue se comunicar em tarefas simples que exigem troca direta de informação.',
      'Consegue descrever em termos simples sua rotina, trabalho ou condições de vida.',
    ],
    B1: [
      'Consegue lidar com a maioria das situações ao viajar em um lugar onde o idioma é falado.',
      'Consegue descrever experiências, planos e ambições, dando razões e explicações breves.',
    ],
    B2: [
      'Consegue interagir com fluência e espontaneidade, permitindo interação natural com nativos.',
      'Consegue apresentar descrições claras e detalhadas sobre uma ampla gama de assuntos.',
    ],
    C1: [
      'Consegue se expressar de forma fluente e espontânea, sem procurar muito as palavras.',
      'Consegue usar a língua de forma flexível e eficaz para fins sociais e profissionais.',
    ],
    C2: [
      'Consegue participar sem esforço em qualquer conversa ou discussão.',
      'Consegue se expressar espontaneamente, com fluência e precisão, marcando nuances de significado.',
    ],
  },
};

export function pickCanDoStatement(skill, level) {
  const options = CAN_DO_STATEMENTS[skill]?.[level] || CAN_DO_STATEMENTS[skill]?.A1 || [];
  if (!options.length) return '';
  return options[Math.floor(Math.random() * options.length)];
}

export function nextCefrLevel(level) {
  const idx = CEFR_LEVELS.indexOf(level);
  if (idx === -1 || idx === CEFR_LEVELS.length - 1) return level;
  return CEFR_LEVELS[idx + 1];
}

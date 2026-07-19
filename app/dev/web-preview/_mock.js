// Dados fictícios só para o preview visual em /dev/web-preview — mesmo
// formato dos dados reais (ver app/v2/(app)/*/page.js), sem nenhuma leitura
// no Supabase. Não usar fora dessa árvore de preview.

export const MOCK_PROFILE = {
  full_name: 'Lucca',
  avatar_url: null,
  streak_count: 12,
  streak_shields: 1,
  weekly_cadence_target: 5,
  active_scenario_id: 'tr_1_w2',
  voice_accent: 'us',
  audio_speed: 1.0,
  session_duration: 8,
  correction_timing: 'inline',
  correction_depth: 'explain_always',
  pronunciation_strictness: 'medium',
  theme: 'light',
  reminder_enabled: true,
  reminder_time: '08:00',
};

export const MOCK_SCENARIOS = [
  { id: 'tr_1_w1', title: 'Mensagem no Slack', subtitle: 'Combinando prazo com o time', stage: 1, target_phrases: 15, masteredCount: 15, ratio: 1, status: 'done', skill_tags: ['prazos', 'slack'] },
  { id: 'tr_1_w2', title: 'E-mail de status', subtitle: 'Atualizando um stakeholder', stage: 1, target_phrases: 15, masteredCount: 9, ratio: 0.6, status: 'current', skill_tags: ['status_update', 'email'] },
  { id: 'tr_1_w3', title: 'Pedido de prazo', subtitle: 'Negociando um deadline apertado', stage: 1, target_phrases: 15, masteredCount: 3, ratio: 0.2, status: 'current', skill_tags: ['negociacao', 'prazos'] },
  { id: 'tr_1_boss_w', title: 'E-mail difícil', subtitle: 'Explicando um atraso pro cliente', stage: 1, target_phrases: 15, masteredCount: 0, ratio: 0, status: 'locked', skill_tags: ['dificil', 'cliente'] },
  { id: 'ent_1_w1', title: 'E-mail de apresentação', subtitle: 'Se candidatando a uma vaga', stage: 1, target_phrases: 15, masteredCount: 0, ratio: 0, status: 'locked', skill_tags: ['entrevista'] },
  { id: 'ent_1_w2', title: 'Resposta a recrutador', subtitle: 'Combinando uma entrevista', stage: 1, target_phrases: 15, masteredCount: 0, ratio: 0, status: 'locked', skill_tags: ['entrevista', 'agendamento'] },
];

export const MOCK_DUE_PHRASES = [
  { id: 'p1', pattern: 'i will have it by', content: { forma_natural: "I'll have it by Friday.", dica: 'prazos · futuro com will' } },
  { id: 'p2', pattern: 'currently working on', content: { forma_natural: "I'm currently working on the report.", dica: 'status update' } },
  { id: 'p3', pattern: 'could i have', content: { forma_natural: 'Could I have a couple more days?', dica: 'pedido educado' } },
  { id: 'p4', pattern: 'let me know', content: { forma_natural: 'Let me know if that works for you.', dica: 'fechamento de e-mail' } },
];

export const MOCK_CONTENT = {
  phrase_of_day: {
    en: "Let's circle back to this next week.",
    explain_pt: 'Forma comum de adiar um assunto educadamente em reuniões — "circle back" = retomar depois.',
    context_label: 'reuniões',
  },
  exercises: {
    writing: [{ prompt_pt: 'Explique que o relatório vai atrasar 1 dia', expected_focus: 'prazos' }, { prompt_pt: 'Peça mais contexto sobre uma tarefa', expected_focus: 'clareza' }, { prompt_pt: 'Confirme que recebeu o e-mail', expected_focus: 'confirmação' }],
    speaking: [{ prompt_pt: 'Se apresente em 30 segundos', expected_focus: 'apresentação' }, { prompt_pt: 'Explique seu maior ponto forte', expected_focus: 'entrevista' }],
  },
};

export const MOCK_LAST_ERROR = {
  wrong_text: 'I am agree with you',
  right_text: 'I agree with you',
  detail_pt: '"Agree" já é um verbo em inglês — não precisa do "am" antes.',
};

export const MOCK_TOP_ERROR_BANNER = { label: 'verbo "to be" desnecessário', count: 3 };

export const MOCK_WEEK_DOTS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((label, i) => ({
  key: label,
  label,
  done: i < 3,
  isToday: i === 3,
}));

export const MOCK_STATS = {
  attemptsThisWeek: 18,
  attemptsLastWeek: 12,
  pctThisWeek: 82,
  pctLastWeek: 71,
  masteredThisWeek: 4,
  masteredTotal: 27,
  minutesThisWeek: 46,
  minutesLastWeek: 33,
};

export const MOCK_PATENTS = {
  writing: { label: 'Claro', nextLabel: 'Natural', remaining: 8, progressPct: 65 },
  speaking: { label: 'Entendível', nextLabel: 'Claro', remaining: 6, progressPct: 40 },
};

export const MOCK_BUCKETS = { hoje: 4, amanha: 6, semana: 9, mes: 14 };

export const MOCK_TOP_ERRORS = [
  { label: 'Verbo "to be" desnecessário', detail: 'Ex: "I am agree" em vez de "I agree"', count: 5 },
  { label: 'Preposições de tempo', detail: 'Confusão entre "in", "on" e "at"', count: 3 },
  { label: 'Ordem de advérbios', detail: 'Advérbio de frequência antes do verbo principal', count: 2 },
];

export const MOCK_QUEUE_WRITING = [
  {
    kind: 'review',
    phraseId: 'p1',
    promptPt: 'Diga ao seu gerente que vai entregar o relatório até sexta.',
    tip: 'prazos · futuro com will',
    categoria: 'prazos',
    formaNatural: "I'll have it by Friday.",
    expectedFocus: 'prazos',
    skillTags: ['prazos'],
  },
  {
    kind: 'new',
    promptPt: 'Explique pro cliente que o projeto vai atrasar 1 dia.',
    expectedFocus: 'prazos',
    skillTags: ['prazos', 'cliente'],
    personalHintPt: 'Use "I\'m afraid" pra suavizar a má notícia.',
    formaNatural: "I'm afraid the project will be a day late.",
  },
  {
    kind: 'new',
    promptPt: 'Peça mais contexto sobre uma tarefa que te passaram.',
    expectedFocus: 'clareza',
    skillTags: ['clareza'],
    personalHintPt: 'Pergunte por exemplos concretos.',
    formaNatural: 'Could you share an example of what you have in mind?',
  },
];

export const MOCK_QUEUE_SPEAKING = [
  {
    kind: 'new',
    promptPt: 'Se apresente em 30 segundos como se fosse numa entrevista.',
    expectedFocus: 'apresentação',
    skillTags: ['entrevista'],
    personalHintPt: 'Comece com seu cargo atual.',
    formaNatural: "Hi, I'm Lucca, I currently work as a product engineer.",
  },
  {
    kind: 'new',
    promptPt: 'Explique seu maior ponto forte no trabalho.',
    expectedFocus: 'entrevista',
    skillTags: ['entrevista'],
    personalHintPt: 'Dê um exemplo concreto.',
    formaNatural: "I'd say my biggest strength is staying calm under pressure.",
  },
];

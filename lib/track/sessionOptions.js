// Opções de personalização da conversa: alimentam o onboarding (os 5 gatilhos)
// e, na Fase 1, viram os prompt overrides / dynamic variables do agente do
// ElevenLabs. Uma única fonte da verdade pra UI e pro prompt.

// Personas com nomes BR. Cada uma é uma variação de prompt; idealmente uma voz
// distinta no ElevenLabs. `drives` é só a dinâmica que combina com a persona —
// o usuário ainda pode sobrescrever com o controle "quem conduz".
export const PERSONAS = [
  {
    id: 'dani', name: 'Daniel', short: 'Dani', role: 'The Interviewer',
    blurb: 'Curioso, pergunta muito e te mantém falando com follow-ups.',
    bestFor: 'interviews, business', drives: 'interview',
  },
  {
    id: 'sam', name: 'Sam', short: 'Sam', role: 'The Chatty Friend',
    blurb: 'Conta histórias da própria vida, usa gíria, energia alta.',
    bestFor: 'fluência, confiança', drives: 'balanced',
  },
  {
    id: 'math', name: 'Matheus', short: 'Math', role: 'The Debate Partner',
    blurb: 'Questiona suas opiniões e rebate com educação; te faz defender seu ponto.',
    bestFor: 'economics, opinion (B2+)', drives: 'balanced',
  },
  {
    id: 'gi', name: 'Giovana', short: 'Gi', role: 'The Coach',
    blurb: 'Estruturada, corrige com frequência e explica rapidinho. A professora.',
    bestFor: 'trilha de aprendizagem', drives: 'balanced',
  },
  {
    id: 'lena', name: 'Helena', short: 'Lena', role: 'The Mentor',
    blurb: 'Reflexiva, perguntas mais profundas, ritmo calmo.',
    bestFor: 'storytelling, opinião', drives: 'lead',
  },
];

export function getPersona(id) {
  return PERSONAS.find((p) => p.id === id) || null;
}

// Quem conduz a conversa — ortogonal à persona.
export const DRIVE_MODES = [
  { id: 'interview', label: 'Ele me entrevista', hint: 'Você fala a maior parte do tempo.' },
  { id: 'balanced', label: 'Equilibrado', hint: 'Vai e volta parelho.' },
  { id: 'lead', label: 'Eu conduzo', hint: 'Você puxa os assuntos.' },
];

// Quando a correção chega.
export const FEEDBACK_MODES = [
  { id: 'live', label: 'Na hora', hint: 'Corrige no momento em que importa. Precisão primeiro.' },
  { id: 'periodic', label: 'A cada X turnos', hint: 'Uma nota rápida a cada ~6–8 trocas. O equilíbrio.', everyTurns: 7 },
  { id: 'end', label: 'Só no fim', hint: 'Recap ao encerrar, sem interromper. Fluência primeiro.' },
];

export const FEEDBACK_INTENSITY = [
  { id: 'essential', label: 'Só o essencial' },
  { id: 'thorough', label: 'Detalhado' },
];

// Modo de sessão.
export const MODES = [
  { id: 'free', label: 'Tema solto', hint: 'Fluência e confiança, correção leve.' },
  { id: 'track', label: 'Trilha', hint: 'Gramática-alvo por sessão e progressão A1→C2.' },
];

// Temas macro + subtemas.
export const THEMES = [
  { id: 'business', name: 'Business', subtopics: ['Meetings', 'Negotiation', 'Product launch', 'Small talk'] },
  { id: 'interviews', name: 'Interviews', subtopics: ['Tell me about yourself', 'Behavioral (STAR)', 'Technical', 'Salary talk'] },
  { id: 'economics', name: 'Economics & Markets', subtopics: ['Inflation', 'Investing', 'Crypto', 'Macro news'] },
  { id: 'sports', name: 'Sports', subtopics: ['Running', 'Tennis', 'Soccer'] },
  { id: 'tech', name: 'Tech & Startups', subtopics: ['Pitching', 'Product', 'Fundraising', 'AI trends'] },
  { id: 'debate', name: 'Debate & Opinion', subtopics: ['Ethics', 'Hot takes', 'Current events'] },
  { id: 'travel', name: 'Travel & Daily life', subtopics: ['Directions', 'Ordering', 'Solving problems'] },
  { id: 'news', name: 'News of the day', subtopics: ['Discuss a real article'] },
];

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || null;
}

// Onde o onboarding começa; o usuário ajusta a partir daqui.
// Feedback default = "a cada X turnos" (decisão do produto).
export const DEFAULTS = {
  mode: 'track',
  feedbackMode: 'periodic',
  feedbackIntensity: 'essential',
  drive: 'balanced',
  persona: 'gi',
};

// Galeria de agentes na aba Conversar — quem você pode chamar pra conversar.
// Por ora só a Cadi (a teacher principal). Especialistas (corrida, finanças,
// recrutadora…) entram aqui depois, cada um com seu agente/override e voz.
export const AGENTS = [
  { id: 'cadi', name: 'Cadi', role: 'The English Teacher', accent: '#2E9E5B' },
];

export const DEFAULT_AGENT = AGENTS[0];

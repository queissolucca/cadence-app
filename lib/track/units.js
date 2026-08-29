// Conteúdo da trilha (C1) — os módulos e unidades B1 e B2 do Playbook.
// Cada unidade = uma micro-lição de 1–2 min: um alvo gramatical (`target`),
// um contexto real (`context`) e um `drill` — a instrução que o agente (Cadi)
// usa pra conduzir os "4 tempos" (gancho, modelo, sua vez, trava).
//
// Base: English Grammar in Use (Murphy, Cambridge) + English Grammar Profile.
// A1/A2 e C1 entram numa fase seguinte; começamos por B1 e B2.

export const TRACK = [
  {
    code: 'B1',
    name: 'Independent',
    blurb: 'Falar com autonomia no dia a dia.',
    modules: [
      {
        id: 'b1-01',
        title: 'Contando histórias — o passado',
        focus: 'Narrar o que aconteceu, com naturalidade.',
        units: [
          { id: 'b1-01-1', title: 'Ever been there?', target: 'present perfect vs past simple', context: 'viagem & experiências', drill: "Get them talking about places they've been using 'have you ever / I've been', switching to the simple past the moment they say WHEN." },
          { id: 'b1-01-2', title: 'While I was cooking…', target: 'past continuous vs simple', context: 'contar um perrengue', drill: "Have them tell a short story where one action interrupted another ('I was cooking when the phone rang')." },
          { id: 'b1-01-3', title: 'I used to…', target: 'used to / would', context: 'infância & hábitos antigos', drill: "Have them describe childhood habits with 'used to' and 'would'." },
          { id: 'b1-01-4', title: 'Just, already, yet', target: 'present perfect + advérbios', context: 'pôr o dia em dia', drill: "Have them report what they've just/already done and what they haven't done yet today." },
          { id: 'b1-01-5', title: 'Then it all happened', target: 'time linkers (when/while/as soon as)', context: 'narrar uma viagem', drill: "Have them narrate a trip connecting events with when, while, as soon as, after." },
        ],
      },
      {
        id: 'b1-02',
        title: 'Planos & o futuro',
        focus: 'Falar de planos, promessas e possibilidades.',
        units: [
          { id: 'b1-02-1', title: 'Going to vs will', target: 'going to / will', context: 'planos vs previsões', drill: "Have them share weekend plans with 'going to' and make predictions with 'will'." },
          { id: 'b1-02-2', title: "I'm meeting them at 7", target: 'present continuous p/ futuro', context: 'sua agenda', drill: "Have them describe fixed arrangements this week using the present continuous." },
          { id: 'b1-02-3', title: "If it rains, I'll…", target: 'first conditional', context: 'combinar com condição', drill: "Have them make plans with real conditions using the first conditional." },
          { id: 'b1-02-4', title: 'Maybe, I might', target: 'might / may', context: 'planos incertos', drill: "Have them talk about uncertain plans with might/may." },
          { id: 'b1-02-5', title: 'When I get home…', target: 'time clauses (when + present)', context: 'depois do trabalho', drill: "Have them talk about the future with 'when/as soon as + present simple' (not will in the time clause)." },
        ],
      },
      {
        id: 'b1-03',
        title: 'Regras, conselho & habilidade',
        focus: 'Obrigação, conselho e pedidos com jeito.',
        units: [
          { id: 'b1-03-1', title: 'Must vs have to', target: 'must / have to / don’t have to', context: 'regras no trabalho/academia', drill: "Have them describe rules and obligations at work or the gym with must / have to / don't have to." },
          { id: 'b1-03-2', title: 'You should…', target: 'should / ought to / had better', context: 'dar conselho', drill: "Have them give a friend advice with should / had better." },
          { id: 'b1-03-3', title: "I can / I'm able to", target: 'can / could / be able to', context: 'habilidades & pedidos', drill: "Have them talk about abilities and make requests with can/could/be able to." },
          { id: 'b1-03-4', title: 'That must be…', target: 'must / can’t (deduction)', context: 'adivinhar', drill: "Have them make deductions/guesses with must / can't." },
          { id: 'b1-03-5', title: 'Could you…? Shall I…?', target: 'requests & offers', context: 'pedidos & ofertas educadas', drill: "Have them make polite requests and offers (Could you…? Shall I…?)." },
        ],
      },
      {
        id: 'b1-04',
        title: 'Descrevendo o seu mundo',
        focus: 'Comparar, detalhar e reclamar como nativo.',
        units: [
          { id: 'b1-04-1', title: 'Bigger, the best', target: 'comparatives & superlatives', context: 'comparar cidades/trabalhos', drill: "Have them compare cities or jobs with comparatives and superlatives." },
          { id: 'b1-04-2', title: 'Not as … as', target: '(not) as … as', context: 'comparações finas', drill: "Have them make equal/unequal comparisons with (not) as … as." },
          { id: 'b1-04-3', title: 'Bored or boring?', target: '-ed vs -ing adjectives', context: 'sentimentos vs coisas', drill: "Have them contrast -ed and -ing adjectives (bored/boring, interested/interesting)." },
          { id: 'b1-04-4', title: 'The guy who…', target: 'defining relative clauses', context: 'descrever pessoas/coisas', drill: "Have them define people and things with who/which/that." },
          { id: 'b1-04-5', title: 'Too much, not enough', target: 'too / enough', context: 'reclamar & padrões', drill: "Have them complain about things using too / not enough." },
        ],
      },
      {
        id: 'b1-05',
        title: 'Quantidade & o cotidiano',
        focus: 'Compras, comida, agenda — o inglês de todo dia.',
        units: [
          { id: 'b1-05-1', title: 'Some, any, much, many', target: 'quantifiers', context: 'mercado & comida', drill: "Have them talk about groceries using some/any/much/many/a lot of." },
          { id: 'b1-05-2', title: 'A few / a little', target: 'a few / a little / a bit of', context: 'quantidades', drill: "Have them talk about quantities with a few / a little / a bit of." },
          { id: 'b1-05-3', title: 'A slice of, a cup of', target: 'contável/incontável + recipientes', context: 'cozinhar', drill: "Have them talk about cooking using portions/containers (a cup of, a slice of, a piece of)." },
          { id: 'b1-05-4', title: 'A, the, or nothing?', target: 'articles a/an/the/zero', context: 'geral vs específico', drill: "Have them practice a/an/the/zero article, contrasting general vs specific." },
          { id: 'b1-05-5', title: 'In, on, at', target: 'prepositions of time/place', context: 'horários & lugares', drill: "Have them talk about schedules and places using in/on/at." },
        ],
      },
      {
        id: 'b1-06',
        title: 'Opiniões & conversa',
        focus: 'Opinar, concordar/discordar e recontar.',
        units: [
          { id: 'b1-06-1', title: 'I reckon that…', target: 'giving opinions', context: 'hot takes', drill: "Have them give opinions with reasons (I think/reckon, in my opinion)." },
          { id: 'b1-06-2', title: 'So do I / Neither do I', target: 'agreeing / disagreeing', context: 'discussão', drill: "Have them agree and disagree naturally (So do I, Neither do I, I'm not sure about that)." },
          { id: 'b1-06-3', title: 'She said that…', target: 'reported speech (basics)', context: 'fofoca / recontar', drill: "Have them report what someone said (He said (that)…)." },
          { id: 'b1-06-4', title: 'He asked if…', target: 'reported questions', context: 'entrevistas', drill: "Have them report questions (He asked if/what…)." },
          { id: 'b1-06-5', title: '…isn’t it?', target: 'question tags', context: 'small talk', drill: "Have them add natural question tags in small talk (…isn't it? …don't you?)." },
        ],
      },
    ],
  },
  {
    code: 'B2',
    name: 'Confident',
    blurb: 'Argumentar, especular e soar natural.',
    modules: [
      {
        id: 'b2-01',
        title: 'Hipóteses & arrependimentos',
        focus: 'Mundos irreais, o que faria e o que já era.',
        units: [
          { id: 'b2-01-1', title: 'If I were you…', target: 'second conditional', context: 'conselho & sonhos', drill: "Have them give advice and dream with the second conditional." },
          { id: 'b2-01-2', title: "If I'd known…", target: 'third conditional', context: 'arrependimentos do passado', drill: "Have them talk about past regrets with the third conditional (If I'd known…, I would have…)." },
          { id: 'b2-01-3', title: "I'd be rich now if…", target: 'mixed conditionals', context: 'consequência hoje do passado', drill: "Have them link a past cause to a present result with mixed conditionals." },
          { id: 'b2-01-4', title: 'I wish I could…', target: 'wish / if only', context: 'desejos & frustrações', drill: "Have them express wishes and regrets with wish / if only (present and past)." },
          { id: 'b2-01-5', title: 'I should have…', target: 'should/could/might have', context: 'olhar pra trás', drill: "Have them look back with should/could/might have + past participle." },
        ],
      },
      {
        id: 'b2-02',
        title: 'Passiva & impessoal',
        focus: 'Processos, notícias, serviços.',
        units: [
          { id: 'b2-02-1', title: "It's made in…", target: 'passive (todos os tempos)', context: 'processos & notícias', drill: "Have them explain a process or news with the passive across tenses." },
          { id: 'b2-02-2', title: "It's said that…", target: 'passive reporting', context: 'boatos & manchetes', drill: "Have them report rumors/news impersonally (It's said that…, He is thought to…)." },
          { id: 'b2-02-3', title: 'I got my hair cut', target: 'have / get something done', context: 'serviços (barbeiro, carro)', drill: "Have them talk about services with have/get something done." },
          { id: 'b2-02-4', title: 'It needs fixing', target: 'need + -ing / causative', context: 'casa & reparos', drill: "Have them talk about things at home that need fixing (need + -ing)." },
          { id: 'b2-02-5', title: 'There seems to be…', target: 'impersonal it / there', context: 'descrever situações', drill: "Have them describe situations impersonally (It seems…, There appears to be…)." },
        ],
      },
      {
        id: 'b2-03',
        title: 'Descrição avançada & orações',
        focus: 'Frases mais longas e precisas, sem travar.',
        units: [
          { id: 'b2-03-1', title: '…, which was great', target: 'non-defining relative clauses', context: 'acrescentar informação', drill: "Have them add extra info with non-defining relative clauses (…, which…, …, who…)." },
          { id: 'b2-03-2', title: 'The guy whose…', target: 'whose / prep + which', context: 'descrição precisa', drill: "Have them describe precisely with whose and preposition + which." },
          { id: 'b2-03-3', title: 'Walking home, I…', target: 'participle clauses', context: 'narrar enxuto', drill: "Have them narrate concisely with participle clauses (Walking home, I saw…)." },
          { id: 'b2-03-4', title: 'So good that…', target: 'so/such … that', context: 'ênfase', drill: "Have them emphasize with so/such … that." },
          { id: 'b2-03-5', title: 'Absolutely freezing', target: 'gradable/ungradable + intensifiers', context: 'opiniões fortes', drill: "Have them use ungradable adjectives with absolutely/really (absolutely freezing, really cold)." },
        ],
      },
      {
        id: 'b2-04',
        title: 'Nuance & postura',
        focus: 'Suavizar, deduzir e mostrar quão certo você está.',
        units: [
          { id: 'b2-04-1', title: 'It must have been…', target: 'deduction (past)', context: 'resolver um mistério', drill: "Have them solve a small mystery with past deduction (must have / can't have / might have)." },
          { id: 'b2-04-2', title: 'It tends to…', target: 'hedging & softening', context: 'opiniões cuidadosas', drill: "Have them soften opinions with hedging (tends to, seems to, sort of, I guess)." },
          { id: 'b2-04-3', title: 'Definitely / probably', target: 'degrees of certainty', context: 'previsões', drill: "Have them make predictions with degrees of certainty (definitely, probably, might)." },
          { id: 'b2-04-4', title: 'Apparently, honestly…', target: 'comment adverbs', context: 'reagir', drill: "Have them react using comment adverbs (apparently, honestly, frankly)." },
          { id: 'b2-04-5', title: 'I DO like it', target: 'emphatic auxiliaries', context: 'insistir / contrariar', drill: "Have them insist or push back with emphatic 'do' (I do like it, I did tell you)." },
        ],
      },
      {
        id: 'b2-05',
        title: 'Padrões de verbo & phrasal verbs',
        focus: 'O que separa "certo" de "soa nativo".',
        units: [
          { id: 'b2-05-1', title: 'Stop doing vs stop to do', target: 'gerund vs infinitive', context: 'hábitos & metas', drill: "Have them contrast verb + -ing vs verb + to (stop doing vs stop to do, remember doing vs to do)." },
          { id: 'b2-05-2', title: 'She suggested going', target: 'reporting verb patterns', context: 'recontar', drill: "Have them retell using reporting-verb patterns (suggest doing, persuade sb to, advise sb to)." },
          { id: 'b2-05-3', title: 'Work out, put off', target: 'common phrasal verbs', context: 'trabalho & vida', drill: "Have them use common phrasal verbs (work out, put off, come up with, deal with)." },
          { id: 'b2-05-4', title: 'Good at, depend on', target: 'dependent prepositions', context: 'fluência', drill: "Have them use dependent prepositions after verbs/adjectives (good at, depend on, interested in)." },
          { id: 'b2-05-5', title: 'Make vs do', target: 'collocations', context: 'escolha natural de palavra', drill: "Have them pick natural collocations (make a decision, do the dishes, strong coffee)." },
        ],
      },
      {
        id: 'b2-06',
        title: 'Discurso & conversa real',
        focus: 'Ligar ideias, contrastar e segurar um debate.',
        units: [
          { id: 'b2-06-1', title: 'Although / despite', target: 'contrast linkers', context: 'argumento equilibrado', drill: "Have them build a balanced argument with although, despite, however, whereas." },
          { id: 'b2-06-2', title: 'So that / in order to', target: 'result & purpose', context: 'explicar', drill: "Have them explain result and purpose (so that, in order to, therefore)." },
          { id: 'b2-06-3', title: "He told me he'd…", target: 'reported speech (full shifts)', context: 'recontar uma conversa', drill: "Have them retell a conversation with full backshift (He told me he'd…)." },
          { id: 'b2-06-4', title: 'What I love is…', target: 'cleft sentences (light)', context: 'destacar o ponto', drill: "Have them highlight their point with cleft sentences (What I love is…, The thing is…)." },
          { id: 'b2-06-5', title: 'Hold on, let me…', target: 'managing conversation', context: 'debate & turnos', drill: "Have them manage turns in a debate (hold on, let me finish, what I mean is, that's a fair point)." },
        ],
      },
    ],
  },
];

// ---- Helpers (consumidos pela tela da trilha C2 e pelo runner C3) ----

export const TRACK_BY_LEVEL = Object.fromEntries(TRACK.map((l) => [l.code, l]));

// Todas as unidades achatadas, em ordem de trilha, com nível/módulo anexados.
export function allUnits() {
  return TRACK.flatMap((level) =>
    level.modules.flatMap((mod, mi) =>
      mod.units.map((u, ui) => ({
        ...u,
        level: level.code,
        moduleId: mod.id,
        moduleTitle: mod.title,
        order: mi * 100 + ui, // ordem estável dentro do nível
      })),
    ),
  );
}

export function getUnit(id) {
  return allUnits().find((u) => u.id === id) || null;
}

export function getModule(id) {
  for (const level of TRACK) {
    const mod = level.modules.find((m) => m.id === id);
    if (mod) return { ...mod, level: level.code };
  }
  return null;
}

// A próxima unidade depois de uma dada (pra "continuar"/auto-avançar em C4).
export function nextUnit(id) {
  const units = allUnits().filter((u) => u.level === (getUnit(id)?.level));
  const idx = units.findIndex((u) => u.id === id);
  return idx >= 0 && idx < units.length - 1 ? units[idx + 1] : null;
}

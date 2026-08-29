// A trilha de aprendizagem CEFR (A1–C2). Ancorada no English Grammar Profile
// da Cambridge: cada nível lista suas metas (can-do) e as estruturas
// gramaticais que pertencem a ele. Uma sessão de "trilha" (Fase 2) pega UMA
// estrutura-alvo do nível e faz o aluno produzi-la dentro do tema escolhido
// (focus-on-form). Dominar as estruturas de um nível libera o próximo.
//
// Cada estrutura tem um `drill`: a instrução do que o agente deve levar o aluno
// a produzir — é isso que entra no prompt do agente na sessão de trilha.

export const LEVELS = [
  {
    code: 'A1',
    name: 'Foundations',
    order: 0,
    canDo: [
      'Introduce yourself and others',
      'Talk about daily routines and what you like',
      'Ask and answer simple personal questions',
    ],
    grammar: [
      { id: 'a1-present-simple', label: 'Present simple', drill: 'describe your daily routine and habits' },
      { id: 'a1-to-be-havegot', label: 'to be / have got', drill: 'describe yourself, your family and what you have' },
      { id: 'a1-basic-questions', label: 'Basic questions (do/does, wh-)', drill: 'ask the coach three questions about their day' },
      { id: 'a1-demonstratives', label: 'this / that / these / those', drill: 'point things out and compare near vs far' },
    ],
  },
  {
    code: 'A2',
    name: 'Everyday',
    order: 1,
    canDo: [
      'Tell a simple story about the past',
      'Describe plans and intentions',
      'Compare people, places and things',
    ],
    grammar: [
      { id: 'a2-past-simple', label: 'Past simple', drill: 'tell the story of your last weekend' },
      { id: 'a2-going-to', label: 'going to (future plans)', drill: 'describe your plans for next week' },
      { id: 'a2-comparatives', label: 'Comparatives & superlatives', drill: 'compare two cities you know' },
      { id: 'a2-quantifiers', label: 'Countable/uncountable & quantifiers', drill: 'talk about what you eat in a typical week' },
    ],
  },
  {
    code: 'B1',
    name: 'Independent',
    order: 2,
    canDo: [
      'Give opinions and back them with reasons',
      'Narrate experiences and connect events',
      'Handle most everyday work and travel talk',
    ],
    grammar: [
      { id: 'b1-present-perfect', label: 'Present perfect', drill: 'talk about life experiences (have you ever…)' },
      { id: 'b1-first-conditional', label: 'First conditional', drill: 'talk about real future possibilities and their results' },
      { id: 'b1-modals-obligation', label: 'Modals of obligation (should / have to / must)', drill: 'give advice and talk about rules at work' },
      { id: 'b1-reported-speech', label: 'Reported speech (basics)', drill: 'tell the coach what someone said to you' },
    ],
  },
  {
    code: 'B2',
    name: 'Confident',
    order: 3,
    canDo: [
      'Argue a viewpoint and weigh pros and cons',
      'Speculate and hypothesize about situations',
      'Discuss abstract and specialized topics',
    ],
    grammar: [
      { id: 'b2-passive', label: 'Passive voice', drill: 'explain a process where the doer is unknown or unimportant' },
      { id: 'b2-conditionals-23', label: 'Second & third conditional', drill: 'talk about unreal situations and past regrets' },
      { id: 'b2-relative-clauses', label: 'Relative clauses', drill: 'define and add detail about people and things' },
      { id: 'b2-hedging', label: 'Hedging & phrasal verbs', drill: 'soften your opinions — it tends to…, sort of…, kind of…' },
    ],
  },
  {
    code: 'C1',
    name: 'Fluent',
    order: 4,
    canDo: [
      'Adjust register between formal and casual',
      'Argue with nuance and precision',
      'Speak at length and hold the floor smoothly',
    ],
    grammar: [
      { id: 'c1-inversion', label: 'Inversion for emphasis', drill: 'emphasize with Never have I…, Not only…' },
      { id: 'c1-cleft', label: 'Cleft sentences', drill: 'restructure for focus — What I mean is…, It was … that' },
      { id: 'c1-nuanced-modality', label: 'Nuanced modality', drill: 'express degrees of certainty and distance' },
      { id: 'c1-discourse-markers', label: 'Discourse markers', drill: 'structure a long turn with signposting' },
    ],
  },
  {
    code: 'C2',
    name: 'Mastery',
    order: 5,
    canDo: [
      'Handle connotation, humor and irony',
      'Speak with spontaneous precision',
      'Sound natural across any register',
    ],
    grammar: [
      { id: 'c2-idiomatic-range', label: 'Wide idiomatic range', drill: 'use idioms naturally, not forced' },
      { id: 'c2-connotation', label: 'Connotation & register control', drill: 'reword the same idea in three registers' },
      { id: 'c2-spontaneous-fluency', label: 'Spontaneous fluency', drill: 'react and improvise on an unexpected turn' },
    ],
  },
];

export const LEVEL_CODES = LEVELS.map((l) => l.code);

export function getLevel(code) {
  return LEVELS.find((l) => l.code === code) || null;
}

// Todas as estruturas-alvo, achatadas e em ordem de trilha — a sequência mestra.
export const ALL_STRUCTURES = LEVELS.flatMap((level) =>
  level.grammar.map((g) => ({ ...g, level: level.code, levelOrder: level.order })),
);

export function getStructure(id) {
  return ALL_STRUCTURES.find((s) => s.id === id) || null;
}

import { TRACK } from './track/units';

// Gamificação estilo RPG — tudo DERIVADO dos dados que já temos (lições feitas,
// conversas, cards dominados, streak). Sem tabela nova: robusto e sempre
// consistente. XP → rank (patente) → missões da semana → conquistas (badges).

// Patentes (ranks) com progressão de RPG. min = XP pra entrar na patente.
const RANKS = [
  { name: 'Aprendiz', icon: '🌱', min: 0 },
  { name: 'Explorador', icon: '🧭', min: 300 },
  { name: 'Aventureiro', icon: '🗺️', min: 800 },
  { name: 'Guardião', icon: '🛡️', min: 1600 },
  { name: 'Cavaleiro', icon: '⚔️', min: 3000 },
  { name: 'Mestre', icon: '🎓', min: 5000 },
  { name: 'Lenda', icon: '👑', min: 8000 },
];

// Quanto cada coisa vale de XP (conversa aberta + trilha, ambas contam).
const XP = { lesson: 60, session: 20, card: 10 };

export function computeGamification({
  completedIds = [],
  sessionsTotal = 0,
  sessionsThisWeek = 0,
  cardsLearned = 0,
  streak = 0,
  unitsThisWeek = 0,
  daysThisWeek = 0,
  weeklyGoal = 5,
}) {
  const done = new Set(completedIds);
  const unitsDone = completedIds.length;

  // Módulos e níveis completos (pra conquistas).
  let modulesDone = 0;
  const levelComplete = {};
  for (const level of TRACK) {
    let all = true;
    for (const mod of level.modules) {
      if (mod.units.every((u) => done.has(u.id))) modulesDone += 1;
      else all = false;
    }
    levelComplete[level.code] = all && level.modules.length > 0;
  }

  const xp = unitsDone * XP.lesson + sessionsTotal * XP.session + cardsLearned * XP.card;

  let idx = 0;
  for (let i = 0; i < RANKS.length; i += 1) if (xp >= RANKS[i].min) idx = i;
  const rank = RANKS[idx];
  const next = RANKS[idx + 1] || null;
  const pct = next ? Math.max(0, Math.min(100, Math.round(((xp - rank.min) / (next.min - rank.min)) * 100))) : 100;
  const xpToNext = next ? Math.max(0, next.min - xp) : 0;

  const quests = [
    { id: 'lessons', icon: '📚', label: 'Complete 3 lições', target: 3, progress: Math.min(unitsThisWeek, 3), reward: 60 },
    { id: 'talk', icon: '🎙️', label: 'Pratique 4 vezes', target: 4, progress: Math.min(sessionsThisWeek, 4), reward: 80 },
    { id: 'days', icon: '🔥', label: `Fique ativo ${weeklyGoal} dias`, target: weeklyGoal, progress: Math.min(daysThisWeek, weeklyGoal), reward: 100 },
  ].map((q) => ({ ...q, done: q.progress >= q.target }));

  const badges = [
    { id: 'first', icon: '👣', name: 'Primeiros passos', desc: '1ª lição concluída', earned: unitsDone >= 1 },
    { id: 'ten', icon: '📚', name: 'Pegando o ritmo', desc: '10 lições concluídas', earned: unitsDone >= 10 },
    { id: 'module', icon: '🏅', name: 'Módulo dominado', desc: '1 módulo completo', earned: modulesDone >= 1 },
    { id: 'talker', icon: '💬', name: 'Tagarela', desc: '20 atividades feitas', earned: sessionsTotal >= 20 },
    { id: 'collector', icon: '🗃️', name: 'Colecionador', desc: '20 cards dominados', earned: cardsLearned >= 20 },
    { id: 's3', icon: '🔥', name: 'Em chamas', desc: '3 dias seguidos', earned: streak >= 3 },
    { id: 's7', icon: '⚡', name: 'Constante', desc: '7 dias seguidos', earned: streak >= 7 },
    { id: 's30', icon: '💎', name: 'Imparável', desc: '30 dias seguidos', earned: streak >= 30 },
    { id: 'b1', icon: '🎖️', name: 'B1 completo', desc: 'Nível B1 terminado', earned: !!levelComplete.B1 },
    { id: 'b2', icon: '🏆', name: 'B2 completo', desc: 'Nível B2 terminado', earned: !!levelComplete.B2 },
  ];

  const ranks = RANKS.map((r, i) => ({
    name: r.name,
    icon: r.icon,
    min: r.min,
    current: i === idx,
    reached: xp >= r.min,
  }));

  return {
    xp,
    rank,
    level: idx + 1,
    next,
    pct,
    xpToNext,
    unitsDone,
    modulesDone,
    quests,
    badges,
    badgesEarned: badges.filter((b) => b.earned).length,
    ranks,
  };
}

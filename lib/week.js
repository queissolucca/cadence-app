const WEEKDAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']; // seg..dom

export function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

export function getWeekDays() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + mondayOffset);
  const today = toDateKey(now);
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = toDateKey(d);
    days.push({ key, label: WEEKDAY_LABELS[i], isToday: key === today });
  }
  return days;
}

export function computeWeekActivity(attempts) {
  const counts = {};
  (attempts || []).forEach((a) => {
    const key = toDateKey(new Date(a.created_at));
    counts[key] = (counts[key] || 0) + 1;
  });
  return getWeekDays().map((d) => ({ ...d, count: counts[d.key] || 0 }));
}

// Dias consecutivos com pelo menos uma tentativa, terminando hoje (ou ontem,
// se o usuário ainda não praticou hoje).
export function computeStreak(attempts) {
  const dateKeys = new Set((attempts || []).map((a) => toDateKey(new Date(a.created_at))));
  let streak = 0;
  let cursor = new Date();
  if (!dateKeys.has(toDateKey(cursor))) {
    cursor = new Date(cursor.getTime() - 86400000);
  }
  while (dateKeys.has(toDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}

// "Cadência semanal" (§4.2) — conta dias distintos com sessão por semana
// (seg-dom), comparado à meta escolhida no onboarding (3/5/7).
export function computeCadenceWeeks(attempts, target, weeksBack = 6) {
  const dayKeys = new Set((attempts || []).map((a) => toDateKey(new Date(a.created_at))));
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(now);
  thisMonday.setHours(0, 0, 0, 0);
  thisMonday.setDate(now.getDate() + mondayOffset);

  const weeks = [];
  for (let w = weeksBack - 1; w >= 0; w -= 1) {
    const monday = new Date(thisMonday);
    monday.setDate(thisMonday.getDate() - w * 7);
    let sessions = 0;
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      if (dayKeys.has(toDateKey(d))) sessions += 1;
    }
    weeks.push({ weekStart: toDateKey(monday), sessions, metGoal: sessions >= target, isCurrent: w === 0 });
  }
  return weeks;
}

// Semanas consecutivas em cadência (perdoa a semana atual em andamento).
export function computeCadenceStreak(weeks) {
  const list = [...weeks].reverse();
  let streak = 0;
  let startIdx = 0;
  if (list[0]?.isCurrent && !list[0].metGoal) startIdx = 1;
  for (let i = startIdx; i < list.length; i += 1) {
    if (list[i].metGoal) streak += 1;
    else break;
  }
  return streak;
}

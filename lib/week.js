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

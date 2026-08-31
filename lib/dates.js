// Helpers de data com fuso fixo em America/Sao_Paulo — todo cálculo de
// dia/semana/streak do app deve passar por aqui, nunca usar new Date() +
// UTC direto (isso já causava um dia de streak "sumir" perto da meia-noite
// pra quem está em SP mas o servidor roda em UTC).

const TIMEZONE = 'America/Sao_Paulo';

function partsInSP(date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const map = {};
  fmt.formatToParts(date).forEach((p) => { map[p.type] = p.value; });
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

function weekdaySP(date) {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short' }).format(date);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd];
}

// "YYYY-MM-DD" do dia em SP — chave estável pra streak/sessões/daily_content.
export function dayKeySP(date = new Date()) {
  const { year, month, day } = partsInSP(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayKeySP() {
  return dayKeySP(new Date());
}

// Segunda-feira 00:00 (SP) da semana que contém `date`.
export function weekStartSP(date = new Date()) {
  const { year, month, day } = partsInSP(date);
  const wd = weekdaySP(date); // 0=domingo
  const diffToMonday = wd === 0 ? -6 : 1 - wd;
  const base = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + diffToMonday);
  return base;
}

// Domingo (mesma semana de weekStartSP).
export function weekEndSP(date = new Date()) {
  const start = weekStartSP(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return end;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// Chave 'YYYY-MM-DD' deslocada em `n` dias. Ancorada ao meio-dia UTC pra não
// pular por horário de verão / virada de mês.
export function addDaysKey(key, n) {
  const d = new Date(`${String(key).slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function prevDayKey(key) {
  return addDaysKey(key, -1);
}

// Instante ISO do início do dia em Brasília (00:01, GMT-3 fixo) pra a chave.
// Usado pra agendar a revisão do dia — "reseta" às 00:01 de Brasília.
export function brasiliaDayStartISO(key) {
  return new Date(`${String(key).slice(0, 10)}T00:01:00-03:00`).toISOString();
}

export function isSameDaySP(a, b) {
  return dayKeySP(a) === dayKeySP(b);
}

// Diferença em dias de calendário (SP) entre duas datas — não em ms/24h,
// pra não errar em torno de horário de verão ou virada de mês.
export function daysBetweenSP(a, b) {
  const ad = new Date(`${dayKeySP(a)}T12:00:00Z`);
  const bd = new Date(`${dayKeySP(b)}T12:00:00Z`);
  return Math.round((bd - ad) / 86400000);
}

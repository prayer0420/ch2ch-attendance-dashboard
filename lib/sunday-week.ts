const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function firstSunday(year: number) {
  const januaryFirst = new Date(Date.UTC(year, 0, 1));
  januaryFirst.setUTCDate(1 + ((7 - januaryFirst.getUTCDay()) % 7));
  return januaryFirst;
}

export function sundayOnOrBefore(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (isoDate(date) !== value) return null;
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return isoDate(date);
}

export function mostRecentSunday(now = new Date()) {
  const localToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  localToday.setUTCDate(localToday.getUTCDate() - localToday.getUTCDay());
  return isoDate(localToday);
}

export function weekOfSunday(value: string) {
  const sundayValue = sundayOnOrBefore(value);
  if (!sundayValue) throw new Error("유효한 날짜가 필요합니다.");
  const sunday = new Date(`${sundayValue}T00:00:00Z`);
  let year = sunday.getUTCFullYear();
  if (sunday < firstSunday(year)) year -= 1;
  const week = Math.round((sunday.getTime() - firstSunday(year).getTime()) / WEEK_MS) + 1;
  return { year, week };
}

export function weeksInSundayYear(year: number) {
  return Math.round((firstSunday(year + 1).getTime() - firstSunday(year).getTime()) / WEEK_MS);
}

export function dateForSundayWeek(year: number, week: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > weeksInSundayYear(year)) return null;
  return isoDate(new Date(firstSunday(year).getTime() + (week - 1) * WEEK_MS));
}

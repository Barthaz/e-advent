export function parseOkienkoParam(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!/^\d{1,2}$/.test(value)) return null;
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 24) return null;
  return day;
}

export function isDayUnlockedByDate(
  day: { isOpened: boolean; date: string },
  today = new Date()
): boolean {
  if (day.isOpened) return true;
  const dayDate = new Date(day.date);
  if (Number.isNaN(dayDate.getTime())) return false;
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayLocal = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
  return dayLocal <= todayLocal;
}

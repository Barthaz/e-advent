export const SANTA_TZ = 'Europe/Warsaw';
export const DEBUG_QUERY_PARAM = 'debug';

export function isDebugMode(search: string = typeof window !== 'undefined' ? window.location.search : ''): boolean {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  return params.get(DEBUG_QUERY_PARAM) === 'true';
}

/** Calendar parts in Europe/Warsaw for a given instant. */
export function getWarsawParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: SANTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') === 24 ? 0 : get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

export function isDecember24(date: Date = new Date()): boolean {
  const { month, day } = getWarsawParts(date);
  return month === 12 && day === 24;
}

/** Live tracking allowed on Dec 24 or when debug mode is on. */
export function canTrackLive(date: Date = new Date(), search?: string): boolean {
  return isDecember24(date) || isDebugMode(search);
}

/**
 * Build a Date representing local Europe/Warsaw wall time on a calendar day.
 * Uses iterative UTC guess (DST-safe enough for Dec 24).
 */
export function warsawDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0,
): Date {
  // Initial guess: treat as UTC+1 (CET); refine with formatter
  let utc = Date.UTC(year, month - 1, day, hour - 1, minute, second);
  for (let i = 0; i < 3; i++) {
    const parts = getWarsawParts(new Date(utc));
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    utc += target - asUtc;
  }
  return new Date(utc);
}

/** Next Dec 24 00:00 Warsaw (or today if already Dec 24). */
export function nextDecember24Start(from: Date = new Date()): Date {
  const parts = getWarsawParts(from);
  if (parts.month === 12 && parts.day === 24) {
    return warsawDateTime(parts.year, 12, 24, 0, 0, 0);
  }
  const year = parts.month === 12 && parts.day > 24 ? parts.year + 1 : parts.year;
  // Before Dec 24 this year, or after → next Dec 24
  if (parts.month < 12 || (parts.month === 12 && parts.day < 24)) {
    return warsawDateTime(parts.year, 12, 24, 0, 0, 0);
  }
  return warsawDateTime(year, 12, 24, 0, 0, 0);
}

export function msUntil(target: Date, from: Date = new Date()): number {
  return Math.max(0, target.getTime() - from.getTime());
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function formatTimeWarsaw(date: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: SANTA_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

import { lerpPoint, project } from './projection';
import { getWarsawParts, warsawDateTime } from './dateGate';

export const ROUTE_DURATION_MS = 24 * 60 * 60 * 1000;
export const NORTH_POLE = { name: 'Biegun Północny', country: 'Laponia', lat: 68.07, lon: 27.03 };

export interface SantaCity {
  id: number;
  name: string;
  country: string;
  lat: number;
  lon: number;
  /** Compact tuple index in loaded array */
  index: number;
}

export interface ScheduleConfig {
  cities: SantaCity[];
  userCityIndex: number;
  /** Arrival hour 0–23 */
  arrivalHour: number;
  /** Arrival minute 0–59 */
  arrivalMinute?: number;
  /** Override calendar year for Dec 24 (defaults to current Warsaw year, or next if past Dec 24) */
  year?: number;
}

export interface ScheduleTimes {
  tStart: number;
  tEnd: number;
  tArrival: number;
  fraction: number;
}

export interface SantaPosition {
  lat: number;
  lon: number;
  x: number;
  y: number;
  /** Float index along route (0 … N-1) */
  posFloat: number;
  currentIndex: number;
  nextIndex: number;
  progress: number;
  beforeStart: boolean;
  afterEnd: boolean;
  atUserCity: boolean;
  visitedCount: number;
}

export function cityFraction(index: number, total: number): number {
  if (total <= 1) return 0;
  return Math.max(0, Math.min(1, index / (total - 1)));
}

export function resolveTrackingYear(now: Date = new Date()): number {
  const parts = getWarsawParts(now);
  if (parts.month === 12 && parts.day > 24) return parts.year + 1;
  return parts.year;
}

export function buildSchedule(config: ScheduleConfig, now: Date = new Date()): ScheduleTimes {
  const { cities, userCityIndex, arrivalHour, arrivalMinute = 0 } = config;
  const year = config.year ?? resolveTrackingYear(now);
  const fraction = cityFraction(userCityIndex, cities.length);
  const tArrival = warsawDateTime(year, 12, 24, arrivalHour, arrivalMinute, 0).getTime();
  const tStart = tArrival - fraction * ROUTE_DURATION_MS;
  const tEnd = tStart + ROUTE_DURATION_MS;
  return { tStart, tEnd, tArrival, fraction };
}

/**
 * Effective "now" for animation: wall clock, optionally sped up from an anchor
 * in debug mode (elapsed * speed from debugAnchor).
 */
export function effectiveNow(
  wallNow: number,
  speed: number,
  debugAnchorWall: number | null,
  debugAnchorVirtual: number | null,
): number {
  if (speed === 1 || debugAnchorWall == null || debugAnchorVirtual == null) {
    return wallNow;
  }
  return debugAnchorVirtual + (wallNow - debugAnchorWall) * speed;
}

export function computePosition(
  cities: SantaCity[],
  schedule: ScheduleTimes,
  nowMs: number,
): SantaPosition {
  const n = cities.length;
  const north = project(NORTH_POLE.lat, NORTH_POLE.lon);

  if (n === 0) {
    return {
      lat: NORTH_POLE.lat,
      lon: NORTH_POLE.lon,
      x: north[0],
      y: north[1],
      posFloat: 0,
      currentIndex: 0,
      nextIndex: 0,
      progress: 0,
      beforeStart: true,
      afterEnd: false,
      atUserCity: false,
      visitedCount: 0,
    };
  }

  if (nowMs < schedule.tStart) {
    const c0 = cities[0];
    const [x, y] = project(c0.lat, c0.lon);
    // Prefer explicit North Pole coords when first city is Laponia start
    const usePole = c0.lat > 65 && Math.abs(c0.lon - NORTH_POLE.lon) < 5;
    return {
      lat: usePole ? NORTH_POLE.lat : c0.lat,
      lon: usePole ? NORTH_POLE.lon : c0.lon,
      x: usePole ? north[0] : x,
      y: usePole ? north[1] : y,
      posFloat: 0,
      currentIndex: 0,
      nextIndex: Math.min(1, n - 1),
      progress: 0,
      beforeStart: true,
      afterEnd: false,
      atUserCity: false,
      visitedCount: 0,
    };
  }

  if (nowMs >= schedule.tEnd) {
    const last = cities[n - 1];
    const [x, y] = project(last.lat, last.lon);
    return {
      lat: last.lat,
      lon: last.lon,
      x,
      y,
      posFloat: n - 1,
      currentIndex: n - 1,
      nextIndex: n - 1,
      progress: 1,
      beforeStart: false,
      afterEnd: true,
      atUserCity: false,
      visitedCount: n,
    };
  }

  const progress = (nowMs - schedule.tStart) / ROUTE_DURATION_MS;
  const posFloat = progress * (n - 1);
  const currentIndex = Math.min(n - 2, Math.floor(posFloat));
  const nextIndex = currentIndex + 1;
  const t = posFloat - currentIndex;
  const a = cities[currentIndex];
  const b = cities[nextIndex];
  const lat = a.lat + (b.lat - a.lat) * t;
  const lon = a.lon + (b.lon - a.lon) * t;
  const [x, y] = lerpPoint(project(a.lat, a.lon), project(b.lat, b.lon), t);

  return {
    lat,
    lon,
    x,
    y,
    posFloat,
    currentIndex,
    nextIndex,
    progress,
    beforeStart: false,
    afterEnd: false,
    atUserCity: false,
    visitedCount: Math.floor(posFloat) + (t > 0.001 ? 0 : 1),
  };
}

export function msUntilArrival(schedule: ScheduleTimes, nowMs: number): number {
  return Math.max(0, schedule.tArrival - nowMs);
}

export function sampleRoutePoints(
  cities: SantaCity[],
  maxPoints = 400,
): { x: number; y: number; index: number }[] {
  if (cities.length === 0) return [];
  const step = Math.max(1, Math.ceil(cities.length / maxPoints));
  const out: { x: number; y: number; index: number }[] = [];
  for (let i = 0; i < cities.length; i += step) {
    const [x, y] = project(cities[i].lat, cities[i].lon);
    out.push({ x, y, index: i });
  }
  const last = cities.length - 1;
  if (out[out.length - 1]?.index !== last) {
    const [x, y] = project(cities[last].lat, cities[last].lon);
    out.push({ x, y, index: last });
  }
  return out;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

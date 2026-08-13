import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SantaCity, SantaPosition, ScheduleTimes } from '../utils/santa/schedule';
import {
  buildSchedule,
  computePosition,
  msUntilArrival,
  easeInOutCubic,
  resolveTrackingYear,
} from '../utils/santa/schedule';
import {
  canTrackLive,
  formatCountdown,
  formatTimeWarsaw,
  getWarsawParts,
  warsawDateTime,
} from '../utils/santa/dateGate';

const POSITION_ANIM_MS = 5000;

export interface UseSantaScheduleOptions {
  cities: SantaCity[];
  userCityIndex: number | null;
  arrivalHour: number;
  arrivalMinute?: number;
  speed?: number;
  search?: string;
  /** true = always live; false = frozen at pole; undefined = date gate */
  forceLive?: boolean;
  /** When true, virtual clock starts on Dec 24 (Warsaw time-of-day) */
  debugMode?: boolean;
  /** When false, no interval/RAF — avoids blocking React Router navigations */
  active?: boolean;
}

export interface SantaScheduleState {
  position: SantaPosition;
  schedule: ScheduleTimes | null;
  nowMs: number;
  liveAllowed: boolean;
  etaMs: number;
  etaLabel: string;
  arrivalLabel: string;
  progressPct: number;
  currentCity: SantaCity | null;
  nextCity: SantaCity | null;
  userCity: SantaCity | null;
  visitedLabel: string;
}

function lerpPos(from: SantaPosition, to: SantaPosition, e: number): SantaPosition {
  return {
    ...to,
    lat: from.lat + (to.lat - from.lat) * e,
    lon: from.lon + (to.lon - from.lon) * e,
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e,
    posFloat: from.posFloat + (to.posFloat - from.posFloat) * e,
    progress: from.progress + (to.progress - from.progress) * e,
  };
}

function december24Equivalent(wallNow: Date): number {
  const parts = getWarsawParts(wallNow);
  const year = resolveTrackingYear(wallNow);
  return warsawDateTime(year, 12, 24, parts.hour, parts.minute, parts.second).getTime();
}

export function useSantaSchedule({
  cities,
  userCityIndex,
  arrivalHour,
  arrivalMinute = 0,
  speed = 1,
  search,
  forceLive,
  debugMode = false,
  active = true,
}: UseSantaScheduleOptions): SantaScheduleState {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const virtualNowRef = useRef<number | null>(null);
  const lastWallRef = useRef<number>(Date.now());
  const prevSpeed = useRef(speed);
  const mountedRef = useRef(true);

  const animFrom = useRef<SantaPosition | null>(null);
  const animTo = useRef<SantaPosition | null>(null);
  const animStart = useRef<number | null>(null);
  const [displayPos, setDisplayPos] = useState<SantaPosition | null>(null);
  const lastArrivalKey = useRef(`${arrivalHour}:${arrivalMinute}:${userCityIndex}`);
  const displayPosRef = useRef<SantaPosition | null>(null);

  const liveAllowed =
    forceLive === true || (forceLive !== false && canTrackLive(new Date(), search)) || debugMode;

  const resetVirtualClock = useCallback(() => {
    virtualNowRef.current = december24Equivalent(new Date());
    lastWallRef.current = Date.now();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (debugMode) {
      resetVirtualClock();
    } else {
      virtualNowRef.current = null;
    }
  }, [debugMode, resetVirtualClock]);

  useEffect(() => {
    if (prevSpeed.current !== speed) {
      prevSpeed.current = speed;
      lastWallRef.current = Date.now();
    }
  }, [speed]);

  // Clock: ~20fps when active for smoother map hops; low-priority updates
  useEffect(() => {
    if (!active) return;

    let raf = 0;
    let intervalId = 0;
    let lastPaint = 0;

    const readNow = () => {
      if (debugMode) {
        const wall = Date.now();
        if (virtualNowRef.current == null) {
          virtualNowRef.current = december24Equivalent(new Date());
          lastWallRef.current = wall;
        } else {
          const dt = wall - lastWallRef.current;
          lastWallRef.current = wall;
          virtualNowRef.current += dt * speed;
        }
        return virtualNowRef.current;
      }
      return Date.now();
    };

    const bump = () => {
      if (!mountedRef.current) return;
      const next = readNow();
      startTransition(() => {
        if (mountedRef.current) setNowMs(next);
      });
    };

    bump();

    if (debugMode && speed > 1) {
      const loop = (t: number) => {
        if (t - lastPaint >= 32) {
          lastPaint = t;
          bump();
        }
        if (mountedRef.current) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    } else {
      // ~12 fps — enough for smooth hops with map-side easing; light on main thread
      intervalId = window.setInterval(bump, 80);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(intervalId);
    };
  }, [active, debugMode, speed]);

  const schedule = useMemo(() => {
    if (userCityIndex == null || cities.length === 0) return null;
    return buildSchedule({
      cities,
      userCityIndex,
      arrivalHour,
      arrivalMinute,
    });
  }, [cities, userCityIndex, arrivalHour, arrivalMinute]);

  const effectiveNow = active
    ? nowMs
    : debugMode
      ? (virtualNowRef.current ?? december24Equivalent(new Date()))
      : Date.now();

  const rawPosition = useMemo(() => {
    if (!schedule || cities.length === 0) {
      return computePosition([], { tStart: 0, tEnd: 0, tArrival: 0, fraction: 0 }, effectiveNow);
    }
    if (!liveAllowed) {
      return computePosition(cities, schedule, schedule.tStart - 1);
    }
    return computePosition(cities, schedule, effectiveNow);
  }, [schedule, cities, effectiveNow, liveAllowed]);

  useEffect(() => {
    const key = `${arrivalHour}:${arrivalMinute}:${userCityIndex}`;
    if (key === lastArrivalKey.current) return;
    lastArrivalKey.current = key;

    if (!displayPosRef.current) {
      displayPosRef.current = rawPosition;
      setDisplayPos(rawPosition);
      return;
    }

    animFrom.current = displayPosRef.current;
    animTo.current = rawPosition;
    animStart.current = performance.now();

    let raf = 0;
    const from = animFrom.current;
    const to = animTo.current;
    const started = animStart.current;

    const frame = () => {
      if (!mountedRef.current) return;
      const elapsed = performance.now() - started;
      const t = Math.min(1, elapsed / POSITION_ANIM_MS);
      const next = lerpPos(from, to, easeInOutCubic(t));
      displayPosRef.current = next;
      setDisplayPos(next);
      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        animStart.current = null;
        animFrom.current = null;
        animTo.current = null;
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // rawPosition read once at key change — intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivalHour, arrivalMinute, userCityIndex]);

  useEffect(() => {
    if (animStart.current != null) return;
    displayPosRef.current = rawPosition;
    startTransition(() => {
      if (mountedRef.current) setDisplayPos(rawPosition);
    });
  }, [rawPosition]);

  const position = displayPos ?? rawPosition;
  const etaMs = schedule ? msUntilArrival(schedule, effectiveNow) : 0;
  const userCity = userCityIndex != null ? cities[userCityIndex] ?? null : null;
  const currentCity = cities[position.currentIndex] ?? null;
  const nextCity = cities[position.nextIndex] ?? null;

  const atUserCity =
    userCityIndex != null &&
    !position.beforeStart &&
    position.posFloat >= userCityIndex &&
    position.posFloat < userCityIndex + 0.5;

  return {
    position: { ...position, atUserCity },
    schedule,
    nowMs: effectiveNow,
    liveAllowed,
    etaMs,
    etaLabel: formatCountdown(etaMs),
    arrivalLabel: schedule ? formatTimeWarsaw(new Date(schedule.tArrival)) : '',
    progressPct: Math.round(position.progress * 1000) / 10,
    currentCity,
    nextCity,
    userCity,
    visitedLabel: `${Math.min(
      cities.length,
      position.beforeStart ? 0 : Math.floor(position.posFloat) + 1,
    )} / ${cities.length}`,
  };
}

export function useSantaNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      startTransition(() => setNow(new Date()));
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

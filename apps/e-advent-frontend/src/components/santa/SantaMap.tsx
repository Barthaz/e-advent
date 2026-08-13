import { useEffect, useMemo, useRef } from 'react';
import { MAP_HEIGHT, MAP_WIDTH, WORLD_PATH } from '../../data/worldPath';
import type { SantaCity, SantaPosition } from '../../utils/santa/schedule';
import { sampleRoutePoints } from '../../utils/santa/schedule';

export interface SantaMapProps {
  cities: SantaCity[];
  position: SantaPosition;
  userCityIndex: number | null;
  showRoute?: boolean;
  className?: string;
}

function buildPolyline(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
}

function starPoints(outerR: number, innerR: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return pts.join(' ');
}

/** Stable trail from fixed route samples up to maxPos (never reshuffles points). */
function trailFromSample(
  sample: { x: number; y: number; index: number }[],
  maxPos: number,
  tipX: number,
  tipY: number,
): string {
  if (sample.length === 0 || maxPos < 0) return '';
  const pts: { x: number; y: number }[] = [];
  for (const p of sample) {
    if (p.index <= maxPos) pts.push({ x: p.x, y: p.y });
    else break;
  }
  if (pts.length === 0) {
    pts.push({ x: sample[0].x, y: sample[0].y });
  }
  pts.push({ x: tipX, y: tipY });
  return buildPolyline(pts);
}

export default function SantaMap({
  cities,
  position,
  userCityIndex,
  showRoute = true,
  className = '',
}: SantaMapProps) {
  const routeSample = useMemo(() => sampleRoutePoints(cities, 600), [cities]);
  const routePath = useMemo(() => buildPolyline(routeSample), [routeSample]);

  const markerRef = useRef<SVGGElement | null>(null);
  const trailRef = useRef<SVGPathElement | null>(null);
  const targetRef = useRef({
    x: position.x,
    y: position.y,
    posFloat: position.posFloat,
    beforeStart: position.beforeStart,
  });
  const smoothRef = useRef({ x: position.x, y: position.y, posFloat: position.posFloat });
  /** High-water mark — trail only grows, never shrinks during easing */
  const maxPosRef = useRef(position.beforeStart ? 0 : position.posFloat);
  const sampleRef = useRef(routeSample);
  sampleRef.current = routeSample;

  targetRef.current = {
    x: position.x,
    y: position.y,
    posFloat: position.posFloat,
    beforeStart: position.beforeStart,
  };

  useEffect(() => {
    let raf = 0;
    let lastTrail = 0;
    const smoothing = 0.14;

    const paintTrail = (sx: number, sy: number, posFloat: number, beforeStart: boolean) => {
      if (!trailRef.current) return;
      if (beforeStart) {
        maxPosRef.current = 0;
        trailRef.current.setAttribute('d', '');
        return;
      }
      maxPosRef.current = Math.max(maxPosRef.current, posFloat);
      trailRef.current.setAttribute(
        'd',
        trailFromSample(sampleRef.current, maxPosRef.current, sx, sy),
      );
    };

    const loop = (t: number) => {
      const target = targetRef.current;
      const cur = smoothRef.current;
      const nx = cur.x + (target.x - cur.x) * smoothing;
      const ny = cur.y + (target.y - cur.y) * smoothing;
      const nf = cur.posFloat + (target.posFloat - cur.posFloat) * smoothing;
      smoothRef.current = { x: nx, y: ny, posFloat: nf };

      if (markerRef.current) {
        markerRef.current.setAttribute('transform', `translate(${nx}, ${ny})`);
      }

      // Update trail every frame while moving — cheap now (stable sample slice)
      if (t - lastTrail > 32) {
        lastTrail = t;
        paintTrail(nx, ny, nf, target.beforeStart);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Snap + reset high-water on big jumps / pole / hour change
  useEffect(() => {
    const cur = smoothRef.current;
    const dist = Math.hypot(position.x - cur.x, position.y - cur.y);
    if (dist > 80 || position.beforeStart) {
      smoothRef.current = { x: position.x, y: position.y, posFloat: position.posFloat };
      maxPosRef.current = position.beforeStart ? 0 : position.posFloat;
      if (markerRef.current) {
        markerRef.current.setAttribute('transform', `translate(${position.x}, ${position.y})`);
      }
      if (trailRef.current) {
        trailRef.current.setAttribute(
          'd',
          position.beforeStart
            ? ''
            : trailFromSample(sampleRef.current, maxPosRef.current, position.x, position.y),
        );
      }
    }
  }, [position.x, position.y, position.posFloat, position.beforeStart]);

  // Keep high-water in sync when progress jumps forward (e.g. speed-up)
  useEffect(() => {
    if (!position.beforeStart && position.posFloat > maxPosRef.current) {
      maxPosRef.current = position.posFloat;
    }
  }, [position.posFloat, position.beforeStart]);

  const userCity = userCityIndex != null ? cities[userCityIndex] : null;
  const userX = userCity ? ((userCity.lon + 180) / 360) * MAP_WIDTH : 0;
  const userY = userCity ? ((90 - userCity.lat) / 180) * MAP_HEIGHT : 0;

  const initialTrail =
    !position.beforeStart && routeSample.length > 0
      ? trailFromSample(routeSample, position.posFloat, position.x, position.y)
      : '';

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-christmas-gold/30 bg-gradient-to-b from-christmas-green to-[#0a2e1c] shadow-lg ${className}`}
    >
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="block h-auto w-full min-h-[240px] sm:min-h-[340px] md:min-h-[460px]"
        role="img"
        aria-label="Mapa świata z trasą Świętego Mikołaja"
      >
        <defs>
          <radialGradient id="santaOcean" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#1a5c3a" />
            <stop offset="100%" stopColor="#0a2e1c" />
          </radialGradient>
          <filter id="santaGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#santaOcean)" />

        {Array.from({ length: 40 }, (_, i) => {
          const x = (i * 97) % MAP_WIDTH;
          const y = (i * 53) % (MAP_HEIGHT * 0.45);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i % 5 === 0 ? 1.2 : 0.7}
              fill="rgba(244,208,63,0.35)"
            />
          );
        })}

        <path
          d={WORLD_PATH}
          fill="rgba(234,213,179,0.55)"
          stroke="rgba(176,141,87,0.45)"
          strokeWidth={0.6}
        />

        {showRoute && routePath && (
          <path
            d={routePath}
            fill="none"
            stroke="rgba(212,175,55,0.22)"
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
        )}

        <path
          ref={trailRef}
          d={initialTrail}
          fill="none"
          stroke="#c41e3a"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.92}
        />

        {userCity && (
          <g filter="url(#santaGlow)">
            <circle cx={userX} cy={userY} r={7} fill="#d4af37" opacity={0.3} />
            <circle cx={userX} cy={userY} r={3.5} fill="#f4d03f" stroke="#ead5b3" strokeWidth={1} />
          </g>
        )}

        <g
          ref={markerRef}
          transform={`translate(${position.x}, ${position.y})`}
          filter="url(#santaGlow)"
        >
          <circle r={11} fill="rgba(244,208,63,0.2)" />
          <polygon
            points={starPoints(9, 4)}
            fill="#f4d03f"
            stroke="#d4af37"
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <polygon points={starPoints(5, 2.2)} fill="#fff8dc" opacity={0.85} />
        </g>
      </svg>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEBUG_QUERY_PARAM, isDebugMode } from '../utils/santa/dateGate';

export const SPEED_OPTIONS = [
  { value: 1, label: '1×' },
  { value: 10, label: '10×' },
  { value: 60, label: '60×' },
  { value: 300, label: '300×' },
] as const;

export function useSantaDebug() {
  const [params] = useSearchParams();
  const enabled = isDebugMode(`?${params.toString()}`) || params.get(DEBUG_QUERY_PARAM) === 'true';
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!enabled) setSpeed(1);
  }, [enabled]);

  return useMemo(
    () => ({
      enabled,
      speed: enabled ? speed : 1,
      setSpeed,
    }),
    [enabled, speed],
  );
}

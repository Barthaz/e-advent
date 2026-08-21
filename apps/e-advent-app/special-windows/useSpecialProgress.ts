import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SpecialWindowDescriptor, SpecialWindowProgress } from '@e-advent/types';
import { getSpecialProgress, saveSpecialProgress } from '../api/api';

const STORAGE_PREFIX = 'e-advent-special-progress';

function storageKey(calendarId: string, taskId: string) {
  return `${STORAGE_PREFIX}:${calendarId}:${taskId}`;
}

export function useSpecialProgress(
  calendarId: string,
  day: number,
  descriptor: SpecialWindowDescriptor | null
) {
  const [progress, setProgress] = useState<SpecialWindowProgress | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!descriptor) return;
    let cancelled = false;

    (async () => {
      const local = await AsyncStorage.getItem(storageKey(calendarId, descriptor.configId));
      if (local) {
        try {
          setProgress(JSON.parse(local));
        } catch {
          /* ignore */
        }
      }
      const remote = await getSpecialProgress(calendarId, day);
      if (!cancelled && remote) setProgress(remote);
      else if (!cancelled && !local) {
        setProgress({
          taskId: descriptor.configId,
          configId: descriptor.configId,
          status: 'NOT_STARTED',
          payloadVersion: 1,
          payload: { started: true },
          updatedAt: new Date().toISOString(),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [calendarId, day, descriptor]);

  const persist = useCallback(
    (next: SpecialWindowProgress) => {
      setProgress(next);
      AsyncStorage.setItem(storageKey(calendarId, next.configId), JSON.stringify(next)).catch(() => {});
      setSaveState('saving');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          await saveSpecialProgress(calendarId, day, next);
          setSaveState('saved');
        } catch {
          setSaveState('error');
        }
      }, 800);
    },
    [calendarId, day]
  );

  const updatePayload = useCallback(
    (patch: Record<string, unknown>) => {
      if (!progress) return;
      persist({
        ...progress,
        status: 'IN_PROGRESS',
        payload: { ...progress.payload, ...patch, started: true },
        updatedAt: new Date().toISOString(),
      });
    },
    [persist, progress]
  );

  return { progress, updatePayload, saveState };
}

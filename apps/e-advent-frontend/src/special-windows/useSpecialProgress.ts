import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpecialWindowDescriptor, SpecialWindowProgress } from '@e-advent/types';
import { getSpecialProgress, saveSpecialProgress } from '../api/api';
import { isPreviewCalendarId } from './previewCalendar';

const STORAGE_PREFIX = 'e-advent-special-progress';

export type DateGateState = {
  revealed: boolean;
  revealAt: string | null;
};

function storageKey(calendarId: string, taskId: string) {
  return `${STORAGE_PREFIX}:${calendarId}:${taskId}`;
}

export function useSpecialProgress(
  calendarId: string,
  day: number,
  descriptor: SpecialWindowDescriptor | null
) {
  const [progress, setProgress] = useState<SpecialWindowProgress | null>(null);
  const [dateGate, setDateGate] = useState<DateGateState | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!descriptor) return;
    let cancelled = false;

    (async () => {
      const local = localStorage.getItem(storageKey(calendarId, descriptor.configId));
      if (local) {
        try {
          setProgress(JSON.parse(local));
        } catch {
          /* ignore */
        }
      }
      if (isPreviewCalendarId(calendarId)) {
        if (!cancelled && !local) {
          setProgress({
            taskId: descriptor.configId,
            configId: descriptor.configId,
            status: 'NOT_STARTED',
            payloadVersion: 1,
            payload: { started: true },
            updatedAt: new Date().toISOString(),
          });
        }
        return;
      }
      const remote = await getSpecialProgress(calendarId, day);
      if (!cancelled && remote.progress) setProgress(remote.progress);
      if (!cancelled && remote.dateGate) setDateGate(remote.dateGate);
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
    async (next: SpecialWindowProgress, extras?: { seal?: boolean; revealAt?: string }) => {
      setProgress(next);
      localStorage.setItem(storageKey(calendarId, next.configId), JSON.stringify(next));
      setSaveState('saving');
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const runSave = async () => {
        if (isPreviewCalendarId(calendarId)) {
          setSaveState('saved');
          return;
        }
        try {
          const saved = await saveSpecialProgress(calendarId, day, {
            ...next,
            ...(extras?.seal ? { seal: true, revealAt: extras.revealAt } : {}),
          });
          if (saved.progress) setProgress(saved.progress);
          if (saved.dateGate) setDateGate(saved.dateGate);
          setSaveState('saved');
        } catch {
          setSaveState('error');
        }
      };

      if (extras?.seal) {
        await runSave();
        return;
      }

      debounceRef.current = setTimeout(() => {
        void runSave();
      }, 800);
    },
    [calendarId, day]
  );

  const updatePayload = useCallback(
    (patch: Record<string, unknown>) => {
      if (!progress) return;
      void persist({
        ...progress,
        status: 'IN_PROGRESS',
        payload: { ...progress.payload, ...patch, started: true },
        updatedAt: new Date().toISOString(),
      });
    },
    [persist, progress]
  );

  const sealProgress = useCallback(
    (revealAt?: string) => {
      if (!progress) return;
      void persist(
        {
          ...progress,
          status: 'IN_PROGRESS',
          payload: { ...progress.payload, sealed: true },
          updatedAt: new Date().toISOString(),
        },
        { seal: true, revealAt }
      );
    },
    [persist, progress]
  );

  return { progress, updatePayload, persist, sealProgress, dateGate, saveState };
}

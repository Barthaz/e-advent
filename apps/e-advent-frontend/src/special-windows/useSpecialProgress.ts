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
  const revisionRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<SpecialWindowProgress | null>(null);
  const pending = useRef<(() => Promise<void>) | null>(null);
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    const revision = ++revisionRef.current;
    setDateGate(null);
    setSaveState('idle');
    current.current = null;
    if (!descriptor) { setProgress(null); return; }
    const key = storageKey(calendarId, descriptor.configId);
    let initial: SpecialWindowProgress = {
      taskId: descriptor.configId, configId: descriptor.configId, status: 'NOT_STARTED',
      payloadVersion: 1, payload: { started: true }, updatedAt: new Date().toISOString(),
    };
    try {
      const local = localStorage.getItem(key);
      if (local && !descriptor.capabilities?.dateGate) initial = JSON.parse(local);
    } catch { /* Invalid/unavailable cache: load the server copy. */ }
    const gated = !!descriptor.capabilities?.dateGate && !isPreviewCalendarId(calendarId);
    current.current = gated ? null : initial;
    setProgress(current.current);
    if (!isPreviewCalendarId(calendarId)) {
      void getSpecialProgress(calendarId, day).then(remote => {
        if (revision !== revisionRef.current) return;
        setDateGate(remote.dateGate || null);
        current.current = remote.progress || current.current || initial;
        setProgress(current.current);
        if (remote.progress) {
          try { localStorage.setItem(key, JSON.stringify(remote.progress)); } catch { /* cache optional */ }
        }
      }).catch(() => {
        if (revision === revisionRef.current) setSaveState('error');
      });
    }
    const revisions = revisionRef;
    return () => {
      revisions.current++;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const save = pending.current;
      pending.current = null;
      if (save) void save();
    };
  }, [calendarId, day, descriptor]);

  const persist = useCallback(
    async (next: SpecialWindowProgress, extras?: { seal?: boolean; revealAt?: string }) => {
      const revision = ++revisionRef.current;
      current.current = next;
      setProgress(next);
      try { localStorage.setItem(storageKey(calendarId, next.configId), JSON.stringify(next)); } catch { /* cache optional */ }
      setSaveState('saving');
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const requestSave = async () => {
        if (isPreviewCalendarId(calendarId)) {
          if (revision === revisionRef.current) setSaveState('saved');
          return;
        }
        try {
          const saved = await saveSpecialProgress(calendarId, day, {
            ...next,
            ...(extras?.seal ? { seal: true, revealAt: extras.revealAt } : {}),
          });
          if (revision !== revisionRef.current) return;
          if (saved.progress) {
            current.current = saved.progress;
            setProgress(saved.progress);
            try { localStorage.setItem(storageKey(calendarId, next.configId), JSON.stringify(saved.progress)); } catch { /* cache optional */ }
          }
          if (saved.dateGate) setDateGate(saved.dateGate);
          setSaveState('saved');
        } catch {
          if (revision === revisionRef.current) setSaveState('error');
        }
      };
      const runSave = () => {
        queue.current = queue.current.then(requestSave);
        return queue.current;
      };

      if (extras?.seal) {
        pending.current = null;
        await runSave();
        return;
      }

      pending.current = runSave;
      debounceRef.current = setTimeout(() => {
        pending.current = null;
        void runSave();
      }, 800);
    },
    [calendarId, day]
  );

  const updatePayload = useCallback(
    (patch: Record<string, unknown>) => {
      const progress = current.current;
      if (!progress) return;
      if (progress.payload.sealed || progress.payload.dateGateLocked) return;
      void persist({
        ...progress,
        status: 'IN_PROGRESS',
        payload: { ...progress.payload, ...patch, started: true },
        updatedAt: new Date().toISOString(),
      });
    },
    [persist]
  );

  const sealProgress = useCallback(
    (revealAt?: string) => {
      const progress = current.current;
      if (!progress) return;
      void persist(
        {
          ...progress,
          status: 'IN_PROGRESS',
          payload: { ...progress.payload },
          updatedAt: new Date().toISOString(),
        },
        { seal: true, revealAt }
      );
    },
    [persist]
  );

  return { progress, updatePayload, persist, sealProgress, dateGate, saveState };
}

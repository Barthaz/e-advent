import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SpecialWindowDescriptor, SpecialWindowProgress } from '@e-advent/types';
import { getSpecialProgress, saveSpecialProgress, type SpecialProgressResponse } from '../api/api';

export function useSpecialProgress(calendarId: string, day: number, descriptor: SpecialWindowDescriptor | null) {
  const [progress, setProgress] = useState<SpecialWindowProgress | null>(null);
  const [dateGate, setDateGate] = useState<SpecialProgressResponse['dateGate']>(undefined);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const revision = useRef(0);
  const current = useRef<SpecialWindowProgress | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<(() => Promise<void>) | null>(null);
  const queue = useRef(Promise.resolve());
  const cacheQueue = useRef(Promise.resolve());

  const cache = useCallback((next: SpecialWindowProgress) => {
    const key = `e-advent-special-progress:${calendarId}:${next.configId}`;
    cacheQueue.current = cacheQueue.current.then(() => AsyncStorage.setItem(key, JSON.stringify(next))).catch(() => {});
  }, [calendarId]);

  useEffect(() => {
    const version = ++revision.current;
    current.current = null;
    setProgress(null);
    setDateGate(undefined);
    setSaveState('idle');
    if (!descriptor) return;
    const initial: SpecialWindowProgress = {
      taskId: descriptor.configId, configId: descriptor.configId, status: 'NOT_STARTED',
      payloadVersion: 1, payload: { started: true }, updatedAt: new Date().toISOString(),
    };
    const apply = (value: SpecialWindowProgress) => { current.current = value; setProgress(value); };
    void (async () => {
      try {
        let raw: string | null = null;
        try { raw = await AsyncStorage.getItem(`e-advent-special-progress:${calendarId}:${descriptor.configId}`); } catch { /* Cache is optional. */ }
        if (version !== revision.current) return;
        // Never reveal cached private content until the server checks its date gate.
        if (!descriptor.capabilities?.dateGate) {
          let local = initial;
          try { if (raw) local = JSON.parse(raw); } catch { /* Ignore corrupt cache. */ }
          apply(local);
        }
        const remote = await getSpecialProgress(calendarId, day);
        if (version !== revision.current) return;
        setDateGate(remote.dateGate);
        apply(remote.progress || current.current || initial);
        if (remote.progress) cache(remote.progress);
      } catch {
        if (version !== revision.current) return;
        if (!descriptor.capabilities?.dateGate && !current.current) apply(initial);
        setSaveState('error');
      }
    })();
    return () => {
      revision.current++;
      if (timer.current) clearTimeout(timer.current);
      // Flush the final edit when switching/closing a window.
      const save = pending.current;
      pending.current = null;
      if (save) void save();
    };
  }, [calendarId, day, descriptor, cache]);

  const persist = useCallback((next: SpecialWindowProgress, seal = false) => {
    const version = ++revision.current;
    current.current = next;
    setProgress(next);
    cache(next);
    setSaveState('saving');
    if (timer.current) clearTimeout(timer.current);
    const save = () => {
      queue.current = queue.current.then(async () => {
        try {
          const result = await saveSpecialProgress(calendarId, day, { ...next, ...(seal ? { seal: true } : {}) });
          if (version !== revision.current) return;
          if (result.progress) {
            current.current = result.progress;
            setProgress(result.progress);
            cache(result.progress);
          }
          setDateGate(result.dateGate);
          setSaveState('saved');
        } catch {
          if (version === revision.current) setSaveState('error');
        }
      });
      return queue.current;
    };
    pending.current = save;
    if (seal) { pending.current = null; void save(); }
    else timer.current = setTimeout(() => { pending.current = null; void save(); }, 800);
  }, [calendarId, day, cache]);

  const updatePayload = useCallback((patch: Record<string, unknown>) => {
    const value = current.current;
    if (!value || value.payload.sealed || value.payload.dateGateLocked) return;
    persist({ ...value, status: 'IN_PROGRESS', payload: { ...value.payload, ...patch, started: true }, updatedAt: new Date().toISOString() });
  }, [persist]);

  const sealProgress = useCallback(() => {
    const value = current.current;
    if (!value || !descriptor?.capabilities?.dateGate) return;
    persist(value, true);
  }, [persist, descriptor]);

  return { progress, dateGate, updatePayload, sealProgress, saveState };
}

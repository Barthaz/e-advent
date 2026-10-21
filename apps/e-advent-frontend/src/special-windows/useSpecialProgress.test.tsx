import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SpecialWindowDescriptor, SpecialWindowProgress } from '@e-advent/types';
import { getSpecialProgress, saveSpecialProgress } from '../api/api';
import { useSpecialProgress } from './useSpecialProgress';

vi.mock('../api/api', () => ({ getSpecialProgress: vi.fn(), saveSpecialProgress: vi.fn() }));
let descriptor = { configId: 'task' } as SpecialWindowDescriptor;
let root: Root;
let state: ReturnType<typeof useSpecialProgress>;
function Harness({ day = 1 }: { day?: number }) { state = useSpecialProgress('calendar', day, descriptor); return null; }
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  descriptor = { configId: 'task' } as SpecialWindowDescriptor;
  vi.mocked(getSpecialProgress).mockResolvedValue({ progress: null });
  vi.mocked(saveSpecialProgress).mockImplementation(async (_id, _day, body) => ({ progress: body as SpecialWindowProgress }));
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  root = createRoot(document.createElement('div'));
});
afterEach(async () => { await act(async () => root.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('retains server progress when no date gate and no local cache exist', async () => {
  const remote = { taskId: 'task', configId: 'task', status: 'COMPLETED' as const, payloadVersion: 1, payload: { answer: 'saved' }, updatedAt: '2026-10-17T00:00:00Z' };
  vi.mocked(getSpecialProgress).mockResolvedValue({ progress: remote });
  await act(async () => root.render(<Harness />));
  expect(state.progress).toEqual(remote);
  expect(state.dateGate).toBeNull();
});
it('keeps local progress and reports a network failure', async () => {
  localStorage.setItem('e-advent-special-progress:calendar:task', JSON.stringify({ payload: { answer: 'local' } }));
  vi.mocked(getSpecialProgress).mockRejectedValue(new Error('offline'));
  await act(async () => root.render(<Harness />));
  expect(state.progress?.payload).toEqual({ answer: 'local' });
  expect(state.saveState).toBe('error');
});
it('flushes the final edit to its original day on navigation', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => state.updatePayload({ answer: 'dzień pierwszy' }));
  descriptor = { ...descriptor, configId: 'another-task' };
  await act(async () => root.render(<Harness day={2} />));
  expect(saveSpecialProgress).toHaveBeenCalledWith('calendar', 1, expect.objectContaining({ payload: expect.objectContaining({ answer: 'dzień pierwszy' }) }));
  expect(state.progress?.payload.answer).toBeUndefined();
});
it('never exposes private cached content when the server is unavailable', async () => {
  descriptor = { ...descriptor, capabilities: { dateGate: true } };
  localStorage.setItem('e-advent-special-progress:calendar:task', JSON.stringify({ payload: { fields: { letter: 'sekret' } } }));
  vi.mocked(getSpecialProgress).mockRejectedValue(new Error('offline'));
  await act(async () => root.render(<Harness />));
  expect(state.progress).toBeNull();
  expect(state.saveState).toBe('error');
});
it('merges synchronous edits and saves them once', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => { state.updatePayload({ first: 1 }); state.updatePayload({ second: 2 }); });
  await act(async () => vi.advanceTimersByTimeAsync(800));
  expect(saveSpecialProgress).toHaveBeenCalledTimes(1);
  expect(state.progress?.payload).toMatchObject({ first: 1, second: 2 });
});
it('keeps the form editable if sealing fails', async () => {
  descriptor = { ...descriptor, capabilities: { dateGate: true } };
  await act(async () => root.render(<Harness />));
  vi.mocked(saveSpecialProgress).mockRejectedValue(new Error('offline'));
  await act(async () => state.sealProgress());
  expect(state.saveState).toBe('error');
  expect(state.progress?.payload.sealed).not.toBe(true);
  await act(async () => state.updatePayload({ answer: 'poprawiona' }));
  expect(state.progress?.payload.answer).toBe('poprawiona');
});

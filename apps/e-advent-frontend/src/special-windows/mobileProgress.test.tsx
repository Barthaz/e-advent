import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SpecialWindowDescriptor, SpecialWindowProgress } from '@e-advent/types';
import AsyncStorage from '../test-support/asyncStorage';
import { getSpecialProgress, saveSpecialProgress } from '../../../e-advent-app/api/api';
import { useSpecialProgress } from '../../../e-advent-app/special-windows/useSpecialProgress';

vi.mock('../../../e-advent-app/api/api', () => ({ getSpecialProgress: vi.fn(), saveSpecialProgress: vi.fn() }));
let root: Root;
let state: ReturnType<typeof useSpecialProgress>;
let descriptor: SpecialWindowDescriptor;
const saved = (payload: Record<string, unknown>): SpecialWindowProgress => ({
  taskId: 'task', configId: 'task', status: 'IN_PROGRESS', payloadVersion: 1, payload, updatedAt: '2026-10-20T00:00:00Z',
});
function Harness({ day = 1 }: { day?: number }) { state = useSpecialProgress('calendar', day, descriptor); return null; }
beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.clearAllMocks();
  await AsyncStorage.clear();
  descriptor = { configId: 'task' } as SpecialWindowDescriptor;
  vi.mocked(getSpecialProgress).mockResolvedValue({ progress: null });
  vi.mocked(saveSpecialProgress).mockImplementation(async (_id, _day, body) => ({ progress: body as SpecialWindowProgress }));
  root = createRoot(document.createElement('div'));
});
afterEach(async () => { await act(async () => root.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('reports network errors without losing a cached answer', async () => {
  await AsyncStorage.setItem('e-advent-special-progress:calendar:task', JSON.stringify(saved({ answer: 'lokalnie' })));
  vi.mocked(getSpecialProgress).mockRejectedValue(new Error('offline'));
  await act(async () => root.render(<Harness />));
  expect(state.progress?.payload.answer).toBe('lokalnie');
  expect(state.saveState).toBe('error');
});
it('ignores a late read after the user begins editing', async () => {
  let resolve!: (value: { progress: SpecialWindowProgress }) => void;
  vi.mocked(getSpecialProgress).mockReturnValue(new Promise(done => { resolve = done; }));
  await act(async () => root.render(<Harness />));
  await act(async () => state.updatePayload({ answer: 'nowa odpowiedź' }));
  await act(async () => resolve({ progress: saved({ answer: 'stara odpowiedź' }) }));
  expect(state.progress?.payload.answer).toBe('nowa odpowiedź');
});
it('flushes the final edit to the original day when switching windows', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => state.updatePayload({ answer: 'dzień pierwszy' }));
  descriptor = { ...descriptor, configId: 'another-task' };
  await act(async () => root.render(<Harness day={2} />));
  expect(saveSpecialProgress).toHaveBeenCalledWith('calendar', 1, expect.objectContaining({ payload: expect.objectContaining({ answer: 'dzień pierwszy' }) }));
  expect(state.progress?.payload.answer).toBeUndefined();
});
it('does not expose private cached contents while offline', async () => {
  descriptor = { ...descriptor, capabilities: { dateGate: true } };
  await AsyncStorage.setItem('e-advent-special-progress:calendar:task', JSON.stringify(saved({ fields: { secret: 'tajemnica' } })));
  vi.mocked(getSpecialProgress).mockRejectedValue(new Error('offline'));
  await act(async () => root.render(<Harness />));
  expect(state.progress).toBeNull();
  expect(state.saveState).toBe('error');
});
it('seals with server confirmation and replaces the cache with redacted contents', async () => {
  descriptor = { ...descriptor, capabilities: { dateGate: true } };
  vi.mocked(getSpecialProgress).mockResolvedValue({ progress: saved({ fields: { letter: 'prywatny list' } }) });
  vi.mocked(saveSpecialProgress).mockResolvedValue({ progress: saved({ sealed: true, dateGateLocked: true }), dateGate: { revealed: false, revealAt: '2026-12-24T12:00:00Z' } });
  await act(async () => root.render(<Harness />));
  await act(async () => state.sealProgress());
  expect(saveSpecialProgress).toHaveBeenCalledWith('calendar', 1, expect.objectContaining({ seal: true }));
  expect(state.dateGate?.revealed).toBe(false);
  expect(await AsyncStorage.getItem('e-advent-special-progress:calendar:task')).not.toContain('prywatny list');
});
it('merges edits made within the same render and debounces the save', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => { state.updatePayload({ first: 1 }); state.updatePayload({ second: 2 }); });
  await act(async () => vi.advanceTimersByTimeAsync(800));
  expect(saveSpecialProgress).toHaveBeenCalledTimes(1);
  expect(state.progress?.payload).toMatchObject({ first: 1, second: 2 });
});

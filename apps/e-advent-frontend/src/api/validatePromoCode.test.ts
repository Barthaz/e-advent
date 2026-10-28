import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PROMO_NETWORK_ERROR_MESSAGE, validatePromoCode } from './api';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const okResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ success: true, valid: true, discount: 10, message: 'ok' }),
};

it('retries once after a network error and sends a preflight-free GET', async () => {
  const fetchMock = vi.fn()
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(okResponse);
  vi.stubGlobal('fetch', fetchMock);

  const pending = validatePromoCode('SAVE10');
  await vi.runAllTimersAsync();

  await expect(pending).resolves.toMatchObject({ valid: true, discount: 10 });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect(init.cache).toBe('no-store');
  expect(init.headers).not.toHaveProperty('Content-Type');
});

it('replaces a repeated "Failed to fetch" with a Polish message', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

  const pending = validatePromoCode('SAVE10');
  const assertion = expect(pending).rejects.toThrow(PROMO_NETWORK_ERROR_MESSAGE);
  await vi.runAllTimersAsync();
  await assertion;
});

it('reports a non-JSON error page without a JSON parse exception', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false,
    status: 502,
    statusText: 'Bad Gateway',
    json: async () => { throw new SyntaxError('Unexpected token <'); },
  }));

  await expect(validatePromoCode('SAVE10')).rejects.toThrow('Nie udało się sprawdzić kodu (błąd 502)');
});

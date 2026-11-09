import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { validatePromoCode } from '../../api/api';
import { CHECKOUT_PROMO_KEY } from '../../utils/checkoutDetails';
import { useCheckoutPromo } from './useCheckoutPromo';

vi.mock('../../api/api', () => ({ validatePromoCode: vi.fn() }));
beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); });
afterEach(cleanup);

it('revalidates the code carried from the cart, without trusting a stored discount', async () => {
  sessionStorage.setItem(CHECKOUT_PROMO_KEY, 'SAVE10');
  vi.mocked(validatePromoCode).mockResolvedValue({ success: true, valid: true, discount: 10, message: 'ok' });
  const { result } = renderHook(useCheckoutPromo);
  expect(result.current.checking).toBe(true);
  expect(result.current.discount).toBeNull();
  await waitFor(() => expect(result.current.discount).toBe(10));
  expect(validatePromoCode).toHaveBeenCalledWith('SAVE10');
});

it('ignores a late validation result after the code is edited or removed', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof validatePromoCode>>) => void;
  vi.mocked(validatePromoCode).mockReturnValue(new Promise(r => { resolve = r; }));
  const { result } = renderHook(useCheckoutPromo);
  act(() => result.current.change('OLD10'));
  let pending!: Promise<void>;
  act(() => { pending = result.current.apply(); });
  act(() => result.current.change('NEW20'));
  await act(async () => { resolve({ success: true, valid: true, discount: 10, message: 'ok' }); await pending; });
  expect(result.current.discount).toBeNull();
  expect(result.current.code).toBe('NEW20');
  expect(sessionStorage.getItem(CHECKOUT_PROMO_KEY)).toBeNull();
});

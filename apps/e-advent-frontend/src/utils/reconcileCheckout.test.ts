import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getPaymentByIntentId, PaymentLookupError } from '../api/api';
import { CART_STORAGE_KEY } from './cartStorage';
import { PENDING_CHECKOUT_KEY, savePendingCheckout } from './checkoutSession';
import { reconcilePendingCheckout } from './reconcileCheckout';

vi.mock('../api/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/api')>();
  return { ...actual, getPaymentByIntentId: vi.fn() };
});
vi.mock('./creatorStorage', () => ({ markCalendarPurchased: vi.fn() }));

const cart = '[{"id":"letter","sku":"santa-letter","quantity":1}]';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  savePendingCheckout({
    paymentIntentId: 'pi_blik',
    orderId: 'order-1',
    orderNumber: '000007',
    clientSecret: 'secret_blik',
    cartSnapshot: cart,
    createdAt: 1,
  });
});
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

it('clears the cart when the stored order is already paid', async () => {
  localStorage.setItem(CART_STORAGE_KEY, cart);
  vi.mocked(getPaymentByIntentId).mockResolvedValue({
    payment: { id: 'order-1', status: 'succeeded', amount: 29, items: [{ sku: 'santa-letter', quantity: 1, unitPrice: 29 }] },
    stripeStatus: 'succeeded',
  });
  await expect(reconcilePendingCheckout()).resolves.toBe('cleared');
  expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  expect(localStorage.getItem(PENDING_CHECKOUT_KEY)).toBeNull();
});

it('keeps the cart while Stripe is still waiting for BLIK', async () => {
  localStorage.setItem(CART_STORAGE_KEY, cart);
  vi.mocked(getPaymentByIntentId).mockResolvedValue({
    payment: { id: 'order-1', status: 'pending', amount: 29, items: [] },
    stripeStatus: 'requires_action',
  });
  await expect(reconcilePendingCheckout()).resolves.toBe('kept');
  expect(localStorage.getItem(CART_STORAGE_KEY)).toBe(cart);
  expect(localStorage.getItem(PENDING_CHECKOUT_KEY)).toBeTruthy();
});

it('restores the paid-for cart when the order is still pending and the cart is empty', async () => {
  vi.mocked(getPaymentByIntentId).mockResolvedValue({
    payment: { id: 'order-1', status: 'pending', amount: 29, items: [] },
    stripeStatus: 'requires_action',
  });
  await expect(reconcilePendingCheckout()).resolves.toBe('restored');
  expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]')).toEqual(
    expect.arrayContaining([expect.objectContaining({ sku: 'santa-letter' })]),
  );
});

it('keeps the cart when the order is missing from the database', async () => {
  localStorage.setItem(CART_STORAGE_KEY, cart);
  vi.mocked(getPaymentByIntentId).mockRejectedValue(new PaymentLookupError(404));
  await expect(reconcilePendingCheckout()).resolves.toBe('kept');
  expect(localStorage.getItem(CART_STORAGE_KEY)).toBe(cart);
  expect(localStorage.getItem(PENDING_CHECKOUT_KEY)).toBeNull();
});

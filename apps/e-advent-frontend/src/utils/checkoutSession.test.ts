import { afterEach, expect, it } from 'vitest';
import {
  PENDING_CHECKOUT_KEY,
  clearCartAfterPaidOrder,
  finishCheckout,
  loadPendingCheckout,
  savePendingCheckout,
} from './checkoutSession';
import { CART_STORAGE_KEY } from './cartStorage';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

it('persists a pending checkout across a new tab', () => {
  savePendingCheckout({
    paymentIntentId: 'pi_blik',
    orderId: 'order-1',
    orderNumber: '000007',
    clientSecret: 'secret_blik',
    cartSnapshot: '[{"id":"letter","sku":"santa-letter","quantity":1}]',
    createdAt: 1,
  });
  expect(loadPendingCheckout()?.paymentIntentId).toBe('pi_blik');
  expect(loadPendingCheckout()?.clientSecret).toBe('secret_blik');
});

it('clears the matching paid cart and checkout cache', () => {
  const cart = '[{"id":"letter","sku":"santa-letter","quantity":1}]';
  localStorage.setItem(CART_STORAGE_KEY, cart);
  localStorage.setItem('paymentIntentId', 'pi_paid');
  localStorage.setItem('orderId', 'order-1');
  localStorage.setItem('orderNumber', '000007');
  sessionStorage.setItem('e-advent-checkout-cart:pi_paid', cart);
  savePendingCheckout({
    paymentIntentId: 'pi_paid',
    orderId: 'order-1',
    clientSecret: 'secret',
    cartSnapshot: cart,
    createdAt: 1,
  });

  expect(clearCartAfterPaidOrder('pi_paid')).toBe(true);
  expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  expect(localStorage.getItem(PENDING_CHECKOUT_KEY)).toBeNull();
  expect(localStorage.getItem('paymentIntentId')).toBeNull();
  expect(localStorage.getItem('orderNumber')).toBeNull();
});

it('does not erase a cart that changed after checkout started', () => {
  sessionStorage.setItem('e-advent-checkout-cart:pi_paid', '[{"id":"old"}]');
  localStorage.setItem(CART_STORAGE_KEY, '[{"id":"new"}]');
  expect(clearCartAfterPaidOrder('pi_paid')).toBe(false);
  expect(localStorage.getItem(CART_STORAGE_KEY)).toBe('[{"id":"new"}]');
});

it('finishCheckout drops the pending checkout even without a cart snapshot', () => {
  savePendingCheckout({
    paymentIntentId: 'pi_x',
    orderId: 'order-x',
    clientSecret: 'secret',
    cartSnapshot: null,
    createdAt: 1,
  });
  finishCheckout('pi_x');
  expect(loadPendingCheckout()).toBeNull();
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CART_STORAGE_KEY,
  clearCartStorage,
  getCartTotals,
  loadCart,
  saveCart,
  appendSantaLetterBundle,
  removeCartItem,
  sanitizeCartItems,
  hasLinkedCertificate,
  SANTA_CERTIFICATE_SKU,
  type CartItem,
} from './cartStorage';
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COST,
  computeOrderTotals,
  getProductPrice,
} from '../config/products';

describe('cartStorage + order totals', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists cart under e-advent-cart', () => {
    const items: CartItem[] = [
      { id: '1', sku: 'santa-letter', quantity: 1, label: 'List' },
    ];
    saveCart(items);
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBeTruthy();
    expect(loadCart()).toEqual(items);
  });

  it('clearCartStorage removes key', () => {
    saveCart([{ id: '1', sku: 'interactive', quantity: 1 }]);
    clearCartStorage();
    expect(loadCart()).toEqual([]);
  });

  it('letter alone pays shipping (29+5=34)', () => {
    const totals = computeOrderTotals([{ sku: 'santa-letter', quantity: 1 }]);
    expect(totals).toEqual({
      subtotal: 29,
      shipping: SHIPPING_COST,
      total: 34,
      hasPhysical: true,
      freeShipping: false,
    });
    expect(getProductPrice('santa-letter')).toBe(34);
  });

  it('digital only = 0 shipping', () => {
    const totals = computeOrderTotals([{ sku: 'interactive', quantity: 2 }]);
    expect(totals).toEqual({
      subtotal: 18,
      shipping: 0,
      total: 18,
      hasPhysical: false,
      freeShipping: false,
    });
  });

  it('free shipping when subtotal >= 100', () => {
    const totals = computeOrderTotals([
      { sku: 'scratch-a4', quantity: 1 },
      { sku: 'santa-letter', quantity: 2 },
    ]);
    // 49 + 58 = 107
    expect(totals?.subtotal).toBeGreaterThanOrEqual(FREE_SHIPPING_THRESHOLD);
    expect(totals?.shipping).toBe(0);
    expect(totals?.freeShipping).toBe(true);
    expect(totals?.total).toBe(totals?.subtotal);
  });

  it('mixed below threshold ships once', () => {
    const totals = computeOrderTotals([
      { sku: 'interactive', quantity: 1 },
      { sku: 'santa-letter', quantity: 1 },
    ]);
    expect(totals).toEqual({
      subtotal: 38,
      shipping: SHIPPING_COST,
      total: 43,
      hasPhysical: true,
      freeShipping: false,
    });
  });

  it('getCartTotals mirrors computeOrderTotals', () => {
    const items: CartItem[] = [
      { id: 'a', sku: 'santa-letter', quantity: 1 },
      { id: 'b', sku: 'interactive', quantity: 1 },
    ];
    expect(getCartTotals(items)).toEqual(
      computeOrderTotals([
        { sku: 'santa-letter', quantity: 1 },
        { sku: 'interactive', quantity: 1 },
      ]),
    );
  });

  it('unknown sku returns null totals', () => {
    expect(computeOrderTotals([{ sku: 'nope', quantity: 1 }])).toBeNull();
  });

  it('appendSantaLetterBundle adds letter and linked certificate atomically', () => {
    const { items, added } = appendSantaLetterBundle([], {
      letterLabel: 'List do Mikołaja',
      childName: 'Kasia',
    });
    expect(items).toHaveLength(2);
    expect(added).toHaveLength(2);
    expect(items[0].sku).toBe('santa-letter');
    expect(items[1].sku).toBe(SANTA_CERTIFICATE_SKU);
    expect(items[1].linkedLetterId).toBe(items[0].id);
    expect(items[1].childName).toBe('Kasia');
  });

  it('removeCartItem removes letter together with linked certificate', () => {
    const { items } = appendSantaLetterBundle([], { childName: 'Jan' });
    const letterId = items[0].id;
    const next = removeCartItem(items, letterId);
    expect(next).toHaveLength(0);
  });

  it('removeCartItem ignores certificate-only removal', () => {
    const { items } = appendSantaLetterBundle([], { childName: 'Jan' });
    const certId = items[1].id;
    const next = removeCartItem(items, certId);
    expect(next).toHaveLength(2);
  });

  it('sanitizeCartItems drops orphan certificates', () => {
    const orphan: CartItem = {
      id: 'cert-1',
      sku: SANTA_CERTIFICATE_SKU,
      quantity: 1,
      linkedLetterId: 'missing-letter',
      childName: 'Ania',
    };
    expect(sanitizeCartItems([orphan])).toEqual([]);
  });

  it('hasLinkedCertificate detects addon on letter line', () => {
    const { items } = appendSantaLetterBundle([], { childName: 'Ola' });
    expect(hasLinkedCertificate(items, items[0].id)).toBe(true);
    expect(hasLinkedCertificate(items, 'unknown')).toBe(false);
  });
});

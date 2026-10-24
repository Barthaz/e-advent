import { describe, it, expect, beforeEach } from 'vitest';
import {
  CART_STORAGE_KEY,
  clearCartStorage,
  getCartTotals,
  loadCart,
  saveCart,
  appendSantaLetterBundle,
  buildCartDisplayRows,
  checkoutItemsFromCart,
  removeCartItem,
  removeCertificate,
  removeOneLetter,
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
    expect(totals).toMatchObject({
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
    expect(totals).toMatchObject({
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
    expect(totals).toMatchObject({
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

  it('removeCertificate deletes only that certificate and keeps the letter', () => {
    const { items } = appendSantaLetterBundle([], { childName: 'Jan' });
    const certId = items[1].id;
    const next = removeCertificate(items, certId);
    expect(next).toHaveLength(1);
    expect(next[0].sku).toBe('santa-letter');
  });

  it('three named letters display as one ×3 line with nested certificates', () => {
    const { items } = appendSantaLetterBundle([], {
      letterQuantity: 3,
      childNames: ['Kasia', 'Jan', 'Ola'],
    });
    const rows = buildCartDisplayRows(items);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'letter-group', quantity: 3 });
    if (rows[0].kind === 'letter-group') {
      expect(rows[0].certificates.map((c) => c.childName)).toEqual(['Kasia', 'Jan', 'Ola']);
    }
    expect(checkoutItemsFromCart(items)).toEqual([
      { sku: 'santa-letter', quantity: 3 },
      { sku: 'santa-certificate', quantity: 1, metadata: { childName: 'Kasia' } },
      { sku: 'santa-certificate', quantity: 1, metadata: { childName: 'Jan' } },
      { sku: 'santa-certificate', quantity: 1, metadata: { childName: 'Ola' } },
    ]);
  });

  it('removeOneLetter drops the last certificate', () => {
    const { items } = appendSantaLetterBundle([], {
      letterQuantity: 3,
      childNames: ['Kasia', 'Jan', 'Ola'],
    });
    const next = removeOneLetter(items);
    const letters = next.filter((item) => item.sku === 'santa-letter');
    const certs = next.filter((item) => item.sku === SANTA_CERTIFICATE_SKU);
    expect(letters.reduce((sum, item) => sum + item.quantity, 0)).toBe(2);
    expect(certs.map((item) => item.childName)).toEqual(['Kasia', 'Jan']);
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

  it('appendSantaLetterBundle adds several unlinked letters as one line', () => {
    const { items, added } = appendSantaLetterBundle([], { letterQuantity: 3 });
    expect(added).toHaveLength(1);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ sku: 'santa-letter', quantity: 3 });
  });

  it('appendSantaLetterBundle adds several letters and fewer named certificates in one go', () => {
    const { items, added } = appendSantaLetterBundle([], {
      letterQuantity: 3,
      childNames: ['Kasia', 'Jan'],
      letterLabel: 'List do Mikołaja',
    });
    const letters = items.filter((item) => item.sku === 'santa-letter');
    const certs = items.filter((item) => item.sku === SANTA_CERTIFICATE_SKU);
    expect(added).toHaveLength(5);
    expect(letters.reduce((sum, item) => sum + item.quantity, 0)).toBe(3);
    expect(certs).toHaveLength(2);
    expect(certs.map((item) => item.childName).sort()).toEqual(['Jan', 'Kasia']);
    expect(certs.every((cert) => letters.some((letter) => letter.id === cert.linkedLetterId))).toBe(true);
  });

  it('plain extra letters merge onto an existing unlinked letter line', () => {
    const first = appendSantaLetterBundle([], { letterQuantity: 2 });
    const second = appendSantaLetterBundle(first.items, {
      letterQuantity: 3,
      childNames: ['Ola'],
    });
    const letters = second.items.filter((item) => item.sku === 'santa-letter');
    const unlinked = letters.filter((item) => !hasLinkedCertificate(second.items, item.id));
    expect(letters.reduce((sum, item) => sum + item.quantity, 0)).toBe(5);
    expect(unlinked).toHaveLength(1);
    expect(unlinked[0].quantity).toBe(4);
  });
});

const {
  getProduct,
  getProductPrice,
  getSkuForTypeAndFormat,
  isPhysicalProduct,
  computeOrderTotals,
  PRODUCTS,
  SHIPPING_COST,
  FREE_SHIPPING_THRESHOLD,
} = require('../../config/products');

const SAMPLE_ADDRESS = {
  fullName: 'Jan Kowalski',
  street: 'ul. Testowa 1',
  city: 'Warszawa',
  postalCode: '00-001',
  phone: '500600700',
};

describe('products catalog (unit)', () => {
  test('interactive price is 9 PLN (no shipping)', () => {
    expect(getProductPrice('interactive')).toBe(9);
  });

  test('scratch-a4 price includes shipping (49+5=54)', () => {
    expect(getProductPrice('scratch-a4')).toBe(54);
  });

  test('scratch-a3 price includes shipping (69+5=74)', () => {
    expect(getProductPrice('scratch-a3')).toBe(74);
  });

  test('santa-letter price includes shipping (29+5=34)', () => {
    expect(getProductPrice('santa-letter')).toBe(34);
    expect(isPhysicalProduct('santa-letter')).toBe(true);
  });

  test('santa-certificate addon is 9 PLN without extra shipping', () => {
    expect(getProduct('santa-certificate')?.basePrice).toBe(9);
    expect(isPhysicalProduct('santa-certificate')).toBe(false);
    const withLetter = computeOrderTotals([
      { sku: 'santa-letter', quantity: 1 },
      { sku: 'santa-certificate', quantity: 1 },
    ]);
    expect(withLetter?.subtotal).toBe(38);
    expect(withLetter?.shipping).toBe(5);
    expect(withLetter?.total).toBe(43);
  });

  test('getOrderItemDisplayName for certificate includes child name', () => {
    const { getOrderItemDisplayName } = require('../../config/products');
    expect(getOrderItemDisplayName('santa-certificate', { childName: 'Kasia' })).toBe(
      'CERTYFIKAT - Kasia',
    );
  });

  test('unknown SKU returns null price', () => {
    expect(getProductPrice('fake-sku')).toBeNull();
    expect(getProduct('fake-sku')).toBeNull();
  });

  test('getSkuForTypeAndFormat maps correctly', () => {
    expect(getSkuForTypeAndFormat('interactive', 'A4')).toBe('interactive');
    expect(getSkuForTypeAndFormat('scratch', 'A4')).toBe('scratch-a4');
    expect(getSkuForTypeAndFormat('scratch', 'A3')).toBe('scratch-a3');
    expect(getSkuForTypeAndFormat('letter', null)).toBe('santa-letter');
  });

  test('isPhysicalProduct', () => {
    expect(isPhysicalProduct('interactive')).toBe(false);
    expect(isPhysicalProduct('scratch-a4')).toBe(true);
    expect(isPhysicalProduct('scratch-a3')).toBe(true);
    expect(isPhysicalProduct('santa-letter')).toBe(true);
  });

  test('SHIPPING_COST is 5 PLN and free threshold 100', () => {
    expect(SHIPPING_COST).toBe(5);
    expect(FREE_SHIPPING_THRESHOLD).toBe(100);
  });

  test('computeOrderTotals: digital only = 0 shipping', () => {
    const t = computeOrderTotals([{ sku: 'interactive', quantity: 2 }]);
    expect(t).toEqual({
      subtotal: 18,
      shipping: 0,
      total: 18,
      hasPhysical: false,
      freeShipping: false,
    });
  });

  test('computeOrderTotals: letter alone pays shipping', () => {
    const t = computeOrderTotals([{ sku: 'santa-letter', quantity: 1 }]);
    expect(t.subtotal).toBe(29);
    expect(t.shipping).toBe(5);
    expect(t.total).toBe(34);
    expect(t.freeShipping).toBe(false);
  });

  test('computeOrderTotals: free shipping when subtotal >= 100', () => {
    const t = computeOrderTotals([
      { sku: 'scratch-a3', quantity: 1 },
      { sku: 'santa-letter', quantity: 2 },
    ]);
    // 69 + 29*2 = 127
    expect(t.subtotal).toBe(127);
    expect(t.shipping).toBe(0);
    expect(t.total).toBe(127);
    expect(t.freeShipping).toBe(true);
  });

  test('computeOrderTotals: mixed below threshold still ships once', () => {
    const t = computeOrderTotals([
      { sku: 'interactive', quantity: 1 },
      { sku: 'santa-letter', quantity: 1 },
    ]);
    expect(t.subtotal).toBe(38);
    expect(t.shipping).toBe(5);
    expect(t.total).toBe(43);
  });

  test('computeOrderTotals: unknown sku returns null', () => {
    expect(computeOrderTotals([{ sku: 'nope', quantity: 1 }])).toBeNull();
  });

  test('all catalog SKUs have positive basePrice', () => {
    Object.values(PRODUCTS).forEach((p) => {
      expect(p.basePrice).toBeGreaterThan(0);
      expect(getProductPrice(p.sku)).toBe(
        p.requiresShipping ? p.basePrice + SHIPPING_COST : p.basePrice
      );
    });
  });
});

module.exports = { SAMPLE_ADDRESS };

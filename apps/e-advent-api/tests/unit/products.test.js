const {
  getProduct,
  getProductPrice,
  getSkuForTypeAndFormat,
  isPhysicalProduct,
  computeOrderTotals,
  applyPercentDiscount,
  paidItemPrices,
  roundPln,
  PRODUCTS,
  SHIPPING_COST,
  FREE_SHIPPING_THRESHOLD,
  isCalendarSku,
  isCalendarsOnSale,
  isLetterPromoActive,
  LETTER_PROMO_CODE,
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
    expect(getSkuForTypeAndFormat('scratch', 'A4')).toBeNull();
    expect(getSkuForTypeAndFormat('scratch')).toBe('scratch-a3');
    expect(getProduct('scratch-a4').discontinued).toBe(true);
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
    expect(t).toMatchObject({
      subtotal: 18,
      shipping: 0,
      total: 18,
      hasPhysical: false,
      freeShipping: false,
      vatRate: 23,
    });
    expect(t.amountNetto + t.vatAmount).toBeCloseTo(t.total, 2);
    expect(t.lines).toHaveLength(1);
    expect(t.lines[0].lineBrutto).toBe(18);
  });

  test('computeOrderTotals: letter alone pays shipping', () => {
    const t = computeOrderTotals([{ sku: 'santa-letter', quantity: 1 }]);
    expect(t.subtotal).toBe(29);
    expect(t.shipping).toBe(5);
    expect(t.total).toBe(34);
    expect(t.freeShipping).toBe(false);
    expect(t.amountNetto + t.vatAmount).toBeCloseTo(34, 2);
    expect(t.shippingNetto + t.shippingVat).toBeCloseTo(5, 2);
  });

  test('splitGrossAmount: 9 PLN brutto → netto + VAT 23%', () => {
    const { splitGrossAmount } = require('../../config/products');
    const split = splitGrossAmount(9, 23);
    expect(split.brutto).toBe(9);
    expect(split.netto).toBe(7.32);
    expect(split.vat).toBe(1.68);
    expect(split.netto + split.vat).toBe(9);
  });

  test('splitGrossAmount: 0 stays zero', () => {
    const { splitGrossAmount } = require('../../config/products');
    expect(splitGrossAmount(0)).toEqual({ brutto: 0, netto: 0, vat: 0, vatRate: 23 });
  });

  test('computeOrderTotals VAT snapshot: netto + vat = brutto for mixed cart', () => {
    const t = computeOrderTotals([
      { sku: 'interactive', quantity: 1 },
      { sku: 'santa-letter', quantity: 1 },
    ]);
    expect(t.total).toBe(43);
    expect(t.amountNetto + t.vatAmount).toBeCloseTo(43, 2);
    expect(t.subtotalNetto + t.subtotalVat).toBeCloseTo(t.subtotal, 2);
    t.lines.forEach((line) => {
      expect(line.lineNetto + line.lineVat).toBeCloseTo(line.lineBrutto, 2);
    });
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

  test('computeOrderTotals: InPost quote is waived at the free-shipping threshold', () => {
    const t = computeOrderTotals(
      [{ sku: 'scratch-a3', quantity: 1 }, { sku: 'santa-letter', quantity: 2 }],
      { shippingAmount: 16.99 },
    );
    expect(t.shipping).toBe(0);
    expect(t.freeShipping).toBe(true);
    expect(t.total).toBe(127);
  });

  test('computeOrderTotals: InPost quote applies below the free-shipping threshold', () => {
    const t = computeOrderTotals(
      [{ sku: 'santa-letter', quantity: 1 }],
      { shippingAmount: 16.99 },
    );
    expect(t.shipping).toBe(16.99);
    expect(t.freeShipping).toBe(false);
    expect(t.total).toBe(45.99);
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

  test('10% discount reduces products and leaves shipping', () => {
    const totals = computeOrderTotals([{ sku: 'santa-letter', quantity: 1 }]);
    const discounted = applyPercentDiscount(totals, 10);
    expect(discounted).toMatchObject({
      subtotal: 29,
      discount: 2.9,
      discountPercent: 10,
      shipping: 5,
      total: 31.1,
    });
    expect(discounted.lines[0]).toMatchObject({ unitPrice: 26.1, lineBrutto: 26.1 });
  });

  test('20% discount reduces products and leaves shipping', () => {
    const totals = computeOrderTotals([{ sku: 'santa-letter', quantity: 1 }]);
    const discounted = applyPercentDiscount(totals, 20);
    expect(discounted).toMatchObject({
      subtotal: 29,
      discount: 5.8,
      discountPercent: 20,
      shipping: 5,
      total: 28.2,
    });
    expect(discounted.lines[0]).toMatchObject({ unitPrice: 23.2, lineBrutto: 23.2 });
  });

  test('95% discount leaves 5% of products and shipping', () => {
    const totals = computeOrderTotals([{ sku: 'santa-letter', quantity: 1 }]);
    const discounted = applyPercentDiscount(totals, 95);
    expect(discounted).toMatchObject({
      subtotal: 29,
      discount: 27.55,
      discountPercent: 95,
      shipping: 0.25,
      total: 1.7,
      freeShipping: false,
    });
    expect(discounted.lines[0]).toMatchObject({ unitPrice: 1.45, lineBrutto: 1.45 });
  });

  test('100% discount zeroes the whole order including shipping', () => {
    const totals = computeOrderTotals([{ sku: 'santa-letter', quantity: 1 }]);
    const discounted = applyPercentDiscount(totals, 100);
    expect(discounted).toMatchObject({
      subtotal: 29,
      discount: 29,
      discountPercent: 100,
      shipping: 0,
      total: 0,
      freeShipping: true,
    });
    expect(discounted.lines[0]).toMatchObject({ unitPrice: 0, lineBrutto: 0 });
  });

  test('20% discount scales mixed letter and certificate lines to paid amounts', () => {
    const totals = computeOrderTotals([
      { sku: 'santa-letter', quantity: 3 },
      { sku: 'santa-certificate', quantity: 3 },
    ]);
    const discounted = applyPercentDiscount(totals, 20);
    expect(discounted.subtotal).toBe(114);
    expect(discounted.discount).toBe(22.8);
    expect(discounted.total).toBe(91.2);
    expect(discounted.lines[0]).toMatchObject({ sku: 'santa-letter', unitPrice: 23.2, lineBrutto: 69.6 });
    expect(discounted.lines[1]).toMatchObject({ sku: 'santa-certificate', unitPrice: 7.2, lineBrutto: 21.6 });
    expect(roundPln(discounted.lines.reduce((sum, line) => sum + line.lineBrutto, 0))).toBe(91.2);
  });

  test('paidItemPrices leaves already discounted lines unchanged', () => {
    const items = [{ sku: 'santa-letter', quantity: 1, unitPrice: 23.2, lineBrutto: 23.2 }];
    expect(paidItemPrices(items, { percent: 20 }, 23.2)).toBe(items);
  });

  test('paidItemPrices scales catalog lines to the paid product total', () => {
    const items = [
      { sku: 'santa-letter', quantity: 1, unitPrice: 29, lineBrutto: 29 },
      { sku: 'santa-certificate', quantity: 1, unitPrice: 9, lineBrutto: 9 },
    ];
    const paid = paidItemPrices(items, { percent: 20, amount: 7.6 }, 30.4);
    expect(paid).not.toBe(items);
    expect(paid[0]).toMatchObject({ unitPrice: 23.2, lineBrutto: 23.2 });
    expect(paid[1]).toMatchObject({ unitPrice: 7.2, lineBrutto: 7.2 });
  });

  test('letter promo window ends when calendars go on sale', () => {
    expect(LETTER_PROMO_CODE).toBe('MIKOLAJ20');
    expect(isCalendarSku('scratch-a3')).toBe(true);
    expect(isCalendarSku('interactive')).toBe(true);
    expect(isCalendarSku('santa-letter')).toBe(false);
    expect(isCalendarsOnSale(new Date('2026-10-31T22:59:59+01:00'))).toBe(false);
    expect(isLetterPromoActive(new Date('2026-10-31T23:59:59+01:00'))).toBe(true);
    expect(isCalendarsOnSale(new Date('2026-11-01T00:00:00+01:00'))).toBe(true);
    expect(isLetterPromoActive(new Date('2026-11-01T00:00:00+01:00'))).toBe(false);
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

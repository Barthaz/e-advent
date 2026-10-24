const { withPaidItemList } = require('../../services/orderPaidPrices');

test('scales catalog item rows to the paid product total', () => {
  const items = [
    { sku: 'santa-letter', quantity: 3, unitPrice: 29, lineBrutto: 87 },
    { sku: 'santa-certificate', quantity: 1, unitPrice: 9, lineBrutto: 9, metadata: { childName: 'Janek' } },
  ];
  const paid = withPaidItemList(items, {
    amount: 76.8,
    shipping_amount: 0,
    metadata: { discount: { code: 'MIKOLAJ20', percent: 20, amount: 19.2 } },
  });
  expect(paid[0]).toMatchObject({ sku: 'santa-letter', unitPrice: 23.2, lineBrutto: 69.6 });
  expect(paid[1]).toMatchObject({ unitPrice: 7.2, lineBrutto: 7.2, metadata: { childName: 'Janek' } });
});

test('does not rescale items that already match the paid total', () => {
  const items = [{ sku: 'santa-letter', quantity: 1, unitPrice: 23.2, lineBrutto: 23.2 }];
  const order = { amount: 28.2, shippingAmount: 5, metadata: { discount: { percent: 20, amount: 5.8 } } };
  expect(withPaidItemList(items, order)).toBe(items);
});

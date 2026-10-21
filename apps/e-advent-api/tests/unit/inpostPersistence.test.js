jest.mock('../../config/database', () => ({ query: jest.fn(), withTransaction: jest.fn(fn => fn()) }));
const { query } = require('../../config/database');
const Payment = require('../../models/Payment');
const { orderFingerprint, canonical } = require('../../services/orderIdentity');
const inpost = require('../../services/inpost');
const { computeOrderTotals } = require('../../config/products');
test.each(['courier_inpost', 'parcel_inpost'])('real Payment model persists %s with matching fingerprint and UUID', async type => {
  require('../helpers/inpostFixture')();
  const d = { ...inpost.quote([{ sku: 'santa-letter', quantity: 1 }], type),
    receiver: { first_name: 'Anna', last_name: 'Nowak', phone: '500600700', email: 'buyer@example.com' },
    point: type === 'parcel_inpost' ? { id: 'KRA01M', name: 'Paczkomat KRA01M', address: 'Testowa 1, Kraków' } : null };
  const sa = { fullName: 'Anna Nowak', phone: '500600700', street: type === 'courier_inpost' ? 'Testowa 1' : '', city: type === 'courier_inpost' ? 'Kraków' : '', postalCode: type === 'courier_inpost' ? '30-001' : '' };
  const totals = computeOrderTotals([{ sku: 'santa-letter', quantity: 1 }], { shippingAmount: d.price });
  const data = { amount: totals.total, shippingAmount: totals.shipping, currency: 'pln', customerEmail: 'buyer@example.com', shippingAddress: sa,
    productType: 'letter', sku: 'santa-letter', hasPhysical: true,
    items: [{ sku: 'santa-letter', productType: 'letter', quantity: 1, unitPrice: 29, metadata: {} }], metadata: { checkoutVersion: 2, inpostDelivery: d } };
  data.metadata.checkoutFingerprint = orderFingerprint(data);
  let row, item;
  query.mockImplementation(async (sql, args) => {
    if (sql.startsWith('INSERT INTO orders') || sql.startsWith('INSERT INTO order_items')) {
      const columns = sql.match(/\(([^)]+)\)/)[1].split(',').map(s => s.trim());
      const record = Object.fromEntries(columns.map((c, i) => [c, args[i]]));
      record.metadata = JSON.stringify(canonical(JSON.parse(record.metadata)));
      if (sql.startsWith('INSERT INTO orders')) row = { ...record, order_number: 123 };
      else item = record;
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('FROM order_items')) return [[item]];
    return [[row]];
  });
  const saved = await Payment.createPayment(data);
  expect(saved.orderNumberDisplay).toBe('000123');
  expect(saved.id).not.toBe('000123');
  expect(saved.deliveryType).toBe(type);
  expect(orderFingerprint(saved)).toBe(data.metadata.checkoutFingerprint);
  expect(orderFingerprint(row, [item])).toBe(data.metadata.checkoutFingerprint);
  expect(saved.parcelLocker).toEqual(d.point);
  expect(saved.customerPhone).toBe('500600700');
  expect(orderFingerprint({ ...row, delivery_type: 'poczta_polska' }, [item])).not.toBe(data.metadata.checkoutFingerprint);
  if (type === 'parcel_inpost') {
    expect(orderFingerprint({ ...row, parcel_locker_id: 'WRONG' }, [item])).not.toBe(data.metadata.checkoutFingerprint);
    expect(orderFingerprint({ ...row, parcel_locker_id: null }, [item])).not.toBe(data.metadata.checkoutFingerprint);
  }
});

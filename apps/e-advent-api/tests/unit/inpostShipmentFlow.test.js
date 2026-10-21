jest.mock('../../config/database', () => ({ query: jest.fn(), withNamedLocks: jest.fn((keys, fn) => fn()) }));
jest.mock('../../models/Payment', () => ({ findPaymentById: jest.fn() }));
jest.mock('../../config/email', () => ({ sendEmail: jest.fn(async () => ({ messageId: 'm1' })) }));
const db = require('../../config/database');
const Payment = require('../../models/Payment');
const { sendEmail } = require('../../config/email');
const inpost = require('../../services/inpost');
const { operate, markLabelPrepared, syncActiveShipments } = require('../../services/inpostFulfillment');
const { orderFingerprint } = require('../../services/orderIdentity');
const setup = require('../helpers/inpostFixture');

let order, row, remote, sent, orderUpdates;
beforeEach(async () => {
  const raw = setup();
  const items = [{ sku: 'santa-letter', quantity: 1, unitPrice: 29 }];
  const d = await inpost.resolveDelivery(items, raw, { firstName: 'Anna', lastName: 'Nowak', phone: '500600700', street: 'Testowa', buildingNumber: '1', city: 'Kraków', postalCode: '30-001' }, 'buyer@example.com');
  order = { id: 'order-uuid', orderNumberDisplay: '000123', status: 'succeeded', amount: 34, shippingAmount: 5, currency: 'pln',
    customerEmail: 'buyer@example.com', deliveryType: 'courier_inpost', items, trackingNumber: null, metadata: { inpostDelivery: d } };
  order.metadata.checkoutFingerprint = orderFingerprint(order);
  Payment.findPaymentById.mockImplementation(async () => ({ ...order }));
  remote = { ...inpost.shipmentPayload(order), id: 456, status: 'confirmed', tracking_number: 'TRACK123' };
  row = { order_id: order.id, environment: 'sandbox', organization_id: '123', shipment_id: '456', state: 'confirmed', buy_attempted: 1,
    payload: JSON.stringify(inpost.shipmentPayload(order)), remote: JSON.stringify(remote), label_downloaded_at: null };
  sent = []; orderUpdates = [];
  sendEmail.mockClear();
  db.query.mockImplementation(async (sql, a) => {
    if (sql.includes('FROM email_sends')) return [sent.some(s => s.type === a[2] && s.status === 'sent') ? [{ id: 'x' }] : []];
    if (sql.startsWith('INSERT INTO email_sends')) { sent.push({ type: a[1], status: a[7] }); return [{ affectedRows: 1 }]; }
    if (sql.includes('FROM order_inpost_shipments s JOIN orders')) return [[{ order_id: order.id }]];
    if (sql.startsWith('SELECT') && sql.includes('order_inpost_shipments')) return [[{ ...row }]];
    if (sql.startsWith('SELECT')) return [[]];
    if (sql.startsWith('UPDATE orders')) {
      orderUpdates.push([sql, a]);
      if (sql.includes('tracking_number = COALESCE')) order.trackingNumber = a[2] || order.trackingNumber;
    }
    if (sql.includes('label_downloaded_at')) row.label_downloaded_at = '2026-10-21 20:00:00';
    return [{ affectedRows: 1 }];
  });
  jest.spyOn(inpost, 'request').mockImplementation(async path => path.includes('/label') ? Buffer.from('%PDF-x') : structuredClone(remote));
});
afterEach(() => jest.restoreAllMocks());

test('label download links shipment to order and sends exactly one prepared email', async () => {
  await expect(operate(order.id, 'label')).resolves.toEqual(Buffer.from('%PDF-x'));
  expect(orderUpdates.some(([sql, a]) => sql.includes('inpost_shipment_id = ?') && a[0] === '456' && a[1] === 'confirmed')).toBe(true);
  await expect(markLabelPrepared(order.id)).resolves.toEqual({ email: 'sent', error: null });
  expect(sendEmail).toHaveBeenCalledTimes(1);
  expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: 'buyer@example.com' });
  expect(sendEmail.mock.calls[0][0].text).toContain('TRACK123');
  expect(orderUpdates.some(([sql]) => sql.includes("fulfillment_status = IF(fulfillment_status = 'pending', 'processing'"))).toBe(true);
  await operate(order.id, 'label');
  await expect(markLabelPrepared(order.id)).resolves.toEqual({ email: 'skipped', error: null });
  expect(sendEmail).toHaveBeenCalledTimes(1);
});

test('prepared email waits for a tracking number instead of sending an empty one', async () => {
  await expect(markLabelPrepared(order.id)).resolves.toMatchObject({ email: 'failed' });
  expect(sendEmail).not.toHaveBeenCalled();
});

test('InPost scan marks the order shipped and delivery marks it delivered, without customer email', async () => {
  remote.status = 'dispatched_by_sender';
  await expect(syncActiveShipments()).resolves.toEqual({ skipped: false, refreshed: 1, failed: 0 });
  expect(orderUpdates.some(([sql]) => sql.includes("fulfillment_status = 'shipped', shipped_at"))).toBe(true);
  remote.status = 'delivered';
  await operate(order.id, 'refresh');
  expect(orderUpdates.some(([sql]) => sql.includes("fulfillment_status = 'delivered'"))).toBe(true);
  expect(sendEmail).not.toHaveBeenCalled();
});

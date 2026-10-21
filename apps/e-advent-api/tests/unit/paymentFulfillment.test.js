jest.mock('../../config/database', () => ({ withTransaction: jest.fn() }));
jest.mock('../../services/orderMailer', () => ({ generateAccessCode: jest.fn(() => 'NEW123') }));
const { withTransaction } = require('../../config/database');
const { fulfillPaidIntent } = require('../../services/paymentFulfillment');

describe('paid order activation', () => {
  let order, items, conn;
  const intent = { id: 'pi_test', amount: 900, amount_received: 900, currency: 'pln', status: 'succeeded', metadata: { orderId: 'order', customerEmail: 'owner@example.com', checkoutFingerprint: 'snapshot' } };
  beforeEach(() => {
    order = { id: 'order', amount: 9, shipping_amount: 0, currency: 'pln', status: 'pending', customer_email: 'owner@example.com', metadata: { checkoutVersion: 2, checkoutFingerprint: 'snapshot' } };
    items = [{ sku: 'interactive', unit_price: 9, quantity: 1, calendar_id: 'cal', metadata: { calendarId: 'cal', ownerEmail: 'owner@example.com' } }];
    order.metadata.checkoutFingerprint = require('../../services/orderIdentity').orderFingerprint(order, items);
    intent.metadata.checkoutFingerprint = order.metadata.checkoutFingerprint;
    conn = { execute: jest.fn(async sql => {
      if (sql.startsWith('SELECT * FROM orders ')) return [[order]];
      if (sql.includes('FROM order_items')) return [items];
      if (sql.includes('FROM calendars')) return [[{ id: 'cal', access_code: 'KEEP12', email: 'owner@example.com', sku: 'interactive', status: 'pending' }]];
      return [{ affectedRows: 1 }];
    }) };
    withTransaction.mockImplementation(fn => fn(conn));
  });
  const writes = () => conn.execute.mock.calls.filter(([sql]) => sql.startsWith('UPDATE'));
  test.each([{ amount: 100 }, { amount_received: 100 }, { currency: 'eur' }, { status: 'processing' }])('rejects mismatched payment without writes: %p', async patch => {
    await expect(fulfillPaidIntent({ ...intent, ...patch })).rejects.toThrow('mismatch');
    expect(writes()).toHaveLength(0);
  });
  test('uses the saved order price and preserves an already issued code', async () => {
    await fulfillPaidIntent(intent);
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(writes()).toHaveLength(2);
    expect(writes()[0][1]).toEqual(['KEEP12', 'delivered', 'cal']);
  });
  test('duplicate event does not reset fulfillment or credentials', async () => {
    order.status = 'succeeded';
    await expect(fulfillPaidIntent(intent)).resolves.toEqual({ duplicate: true, orderId: 'order' });
    expect(writes()).toHaveLength(0);
  });
  test('does not mark an order paid when saved items are inconsistent', async () => {
    items[0].unit_price = 1;
    await expect(fulfillPaidIntent(intent)).rejects.toThrow('items');
    expect(writes()).toHaveLength(0);
  });
  test('propagates a database failure to the transaction owner', async () => {
    conn.execute.mockRejectedValueOnce(new Error('DB unavailable'));
    await expect(fulfillPaidIntent(intent)).rejects.toThrow('DB unavailable');
  });
  test.each([{ orderId: 'other-order' }, { customerEmail: 'other@example.com' }, { checkoutFingerprint: 'other-cart' }])('rejects a signed intent linked to the wrong identity: %p', async patch => {
    await expect(fulfillPaidIntent({ ...intent, metadata: { ...intent.metadata, ...patch } })).rejects.toThrow('identity mismatch');
    expect(writes()).toHaveLength(0);
  });
  test('does not deliver to a replaced calendar recipient', async () => {
    items[0].metadata.ownerEmail = 'another@example.com';
    await expect(fulfillPaidIntent(intent)).rejects.toThrow('snapshot');
    expect(writes()).toHaveLength(0);
  });
  test('does not silently lose a deleted calendar from a paid order', async () => {
    items[0].calendar_id = null;
    await expect(fulfillPaidIntent(intent)).rejects.toThrow('snapshot');
    expect(writes()).toHaveLength(0);
  });
  test('accepts legacy metadata only when the stored client reference also matches', async () => {
    order.metadata = { clientOrderId: 'legacy-client-ref' };
    await expect(fulfillPaidIntent({ ...intent, metadata: { ...intent.metadata, orderId: 'legacy-client-ref' } })).resolves.toMatchObject({ duplicate: false });
  });
  test('email retry job is persisted in the same transaction as activation', async () => {
    await fulfillPaidIntent(intent);
    expect(conn.execute).toHaveBeenCalledWith('INSERT IGNORE INTO order_email_jobs (order_id) VALUES (?)', ['order']);
  });
});

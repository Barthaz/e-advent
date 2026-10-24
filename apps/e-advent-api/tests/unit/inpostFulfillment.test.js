jest.mock('../../config/database', () => ({ query: jest.fn(), withNamedLocks: jest.fn() }));
jest.mock('../../models/Payment', () => ({ findPaymentById: jest.fn() }));
jest.mock('../../models/EmailSend', () => ({ hasSuccessfulOrderEmail: jest.fn() }));
jest.mock('../../services/orderMailer', () => ({ sendShipmentPreparedEmail: jest.fn(), sendShippingEmailForOrder: jest.fn() }));
const db = require('../../config/database');
const Payment = require('../../models/Payment');
const EmailSend = require('../../models/EmailSend');
const inpost = require('../../services/inpost');
const { sendShipmentPreparedEmail, sendShippingEmailForOrder } = require('../../services/orderMailer');
const { operate, markDispatched, advanceShipment, ensureShipment, createMissingShipments } = require('../../services/inpostFulfillment');
const { orderFingerprint } = require('../../services/orderIdentity');
const setup = require('../helpers/inpostFixture');
let order, row, remote, network;
beforeEach(async () => {
  const raw = setup();
  const items = [{ sku: 'santa-letter', quantity: 1, unitPrice: 29 }];
  const d = await inpost.resolveDelivery(items, raw, { firstName: 'Anna', lastName: 'Nowak', phone: '500600700', street: 'Testowa', buildingNumber: '1', city: 'Kraków', postalCode: '30-001' }, 'buyer@example.com');
  order = { id: 'saved-order-uuid', orderNumberDisplay: '000123', status: 'succeeded', amount: 34, shippingAmount: 5, currency: 'pln', customerEmail: 'buyer@example.com', items, metadata: { inpostDelivery: d } };
  order.metadata.checkoutFingerprint = orderFingerprint(order);
  Payment.findPaymentById.mockImplementation(async () => order);
  row = null;
  remote = { ...inpost.shipmentPayload(order), id: 456, status: 'offers_prepared', offers: [{ id: 789, service: { id: d.service }, status: 'available', currency: 'PLN', rate: 6 }] };
  let queue = Promise.resolve();
  db.withNamedLocks.mockImplementation((keys, fn) => {
    const next = queue.then(fn); queue = next.catch(() => {}); return next;
  });
  db.query.mockImplementation(async (sql, a) => {
    if (sql.startsWith('SELECT')) return [row ? [{ ...row }] : []];
    if (sql.startsWith('INSERT')) { row = { order_id: a[0], environment: a[1], organization_id: a[2], state: a[3], payload: a[4], remote: null, buy_attempted: 0 }; }
    else if (sql.includes('SET shipment_id = ?, state')) Object.assign(row, { shipment_id: a[0], state: a[1], remote: JSON.parse(a[2]) });
    else if (sql.includes('SET shipment_id = ?')) row.shipment_id = a[0];
    else if (sql.includes('SET remote = ?')) Object.assign(row, { remote: JSON.parse(a[0]), state: a[1] });
    else if (sql.includes("SET state = 'create_rejected'")) row.state = 'create_rejected';
    else if (sql.includes("SET state = 'create_pending'")) row.state = 'create_pending';
    else if (sql.includes('SET buy_attempted')) { row.buy_attempted = 1; row.state = 'buy_pending'; }
    return [{ affectedRows: 1 }];
  });
  EmailSend.hasSuccessfulOrderEmail.mockReset();
  EmailSend.hasSuccessfulOrderEmail.mockResolvedValue(false);
  sendShipmentPreparedEmail.mockReset();
  sendShipmentPreparedEmail.mockResolvedValue({ sent: 1, failed: 0, skipped: false, results: [{}] });
  sendShippingEmailForOrder.mockReset();
  sendShippingEmailForOrder.mockResolvedValue({ sent: 1, failed: 0, skipped: false, results: [{}] });
  network = jest.spyOn(inpost, 'request').mockImplementation(async (path, options) => {
    if (path.includes('/buy')) { remote.status = 'confirmed'; remote.tracking_number = '123456789012345678901234'; }
    if (path.includes('/label')) return Buffer.from('%PDF-test');
    return structuredClone(remote);
  });
});
afterEach(() => { network.mockRestore(); });
test('definitively rejected creation can be retried after fixing sender configuration', async () => {
  network.mockRejectedValueOnce(Object.assign(new Error('invalid sender'), { providerStatus: 422 }));
  await expect(operate(order.id, 'create')).rejects.toThrow('invalid sender');
  expect(row.state).toBe('create_rejected');
  await expect(operate(order.id, 'create')).resolves.toMatchObject({ shipmentId: '456', canBuy: true });
});
test('confirmed shipment remains paid when later status is not in the known status list', async () => {
  await operate(order.id, 'create');
  await operate(order.id, 'buy', { offerId: 789, acceptedPrice: 6 });
  remote.status = 'some_later_provider_status';
  await expect(operate(order.id, 'refresh')).resolves.toMatchObject({ labelReady: true, canBuy: false, needsReview: false });
  await expect(operate(order.id, 'label')).resolves.toEqual(Buffer.from('%PDF-test'));
});
test('an altered persisted shipment payload cannot authorize another recipient', async () => {
  await operate(order.id, 'create');
  const changed = JSON.parse(row.payload);
  changed.receiver.email = 'other@example.com';
  row.payload = JSON.stringify(changed);
  await expect(operate(order.id, 'buy', { offerId: 789, acceptedPrice: 6 })).rejects.toThrow('Zapis przesyłki');
});
test('expired offer cannot initiate a purchase', async () => {
  await operate(order.id, 'create');
  remote.offers[0].expires_at = '2000-01-01T00:00:00Z';
  await expect(operate(order.id, 'buy', { offerId: 789, acceptedPrice: 6 })).rejects.toThrow('Oferta wygasła');
  expect(row.buy_attempted).toBe(0);
});
test('parallel creates persist one shipment, using UUID plus readable reference and no auto-purchase', async () => {
  const results = await Promise.all([operate(order.id, 'create'), operate(order.id, 'create')]);
  expect(results[0].shipmentId).toBe('456');
  expect(network.mock.calls.filter(([path, opts]) => opts?.method === 'POST')).toHaveLength(1);
  expect(JSON.parse(row.payload)).toMatchObject({ reference: 'EA-000123-saved-order-uuid', only_choice_of_offer: true });
  expect(results[0].labelReady).toBe(false);
});
test('lost creation response never creates a second shipment; exact matching one can be reconciled', async () => {
  network.mockRejectedValueOnce(new Error('timeout'));
  await expect(operate(order.id, 'create')).rejects.toThrow('timeout');
  const retry = await operate(order.id, 'create');
  expect(retry.needsReview).toBe(true);
  expect(network).toHaveBeenCalledTimes(1);
  await expect(operate(order.id, 'reconcile', { shipmentId: '456' })).resolves.toMatchObject({ shipmentId: '456' });
});
test('DB failure after creation is recovered without duplicate creation', async () => {
  const realQuery = db.query.getMockImplementation();
  db.query.mockImplementation(async (sql, a) => { if (sql.includes('SET shipment_id = ?, state')) throw new Error('DB down'); return realQuery(sql, a); });
  await expect(operate(order.id, 'create')).rejects.toThrow('DB down');
  await operate(order.id, 'create');
  expect(network).toHaveBeenCalledTimes(1);
});
test('new offer price must be explicitly accepted before buying', async () => {
  await operate(order.id, 'create');
  await expect(operate(order.id, 'buy', { offerId: 789, acceptedPrice: 5 })).rejects.toThrow('Oferta zmieniła');
  expect(row.buy_attempted).toBe(0);
  await expect(operate(order.id, 'buy', { offerId: 789, acceptedPrice: 6 })).resolves.toMatchObject({ labelReady: true, trackingNumber: '123456789012345678901234' });
  await expect(operate(order.id, 'buy', { offerId: 789, acceptedPrice: 6 })).rejects.toThrow('Zakup już');
  expect(network.mock.calls.filter(([path]) => path.endsWith('/buy'))).toHaveLength(1);
});
test('lost buy response does not repeat payment; refresh recovers confirmation and label downloads are read-only', async () => {
  await operate(order.id, 'create');
  network.mockImplementation(async path => {
    if (path.endsWith('/buy')) { remote.status = 'confirmed'; throw new Error('timeout'); }
    if (path.includes('/label')) return Buffer.from('%PDF-test');
    return structuredClone(remote);
  });
  await expect(operate(order.id, 'buy', { offerId: 789, acceptedPrice: 6 })).rejects.toThrow('timeout');
  await expect(operate(order.id, 'refresh')).resolves.toMatchObject({ labelReady: true });
  await expect(operate(order.id, 'label')).resolves.toEqual(Buffer.from('%PDF-test'));
  await operate(order.id, 'label');
  expect(network.mock.calls.filter(([path]) => path.endsWith('/buy'))).toHaveLength(1);
});
test('does not allow label download before purchase', async () => {
  await operate(order.id, 'create');
  await expect(operate(order.id, 'label')).rejects.toThrow('po potwierdzeniu');
  expect(network.mock.calls.some(([path]) => path.includes('/label'))).toBe(false);
});
test('generate creates the shipment, buys the matching offer and does not email by itself', async () => {
  await expect(operate(order.id, 'generate')).resolves.toMatchObject({
    shipmentId: '456', labelReady: true, trackingNumber: '123456789012345678901234',
  });
  expect(network.mock.calls.filter(([path]) => path.endsWith('/buy'))).toHaveLength(1);
  expect(sendShipmentPreparedEmail).not.toHaveBeenCalled();
});
test('generate does not buy when InPost has not prepared an offer yet', async () => {
  remote.offers = [];
  await expect(operate(order.id, 'generate')).resolves.toMatchObject({ shipmentId: '456', labelReady: false, canBuy: false });
  expect(network.mock.calls.some(([path]) => path.endsWith('/buy'))).toBe(false);
});
test('generate is idempotent after a paid label and does not buy again', async () => {
  await operate(order.id, 'generate');
  await expect(operate(order.id, 'generate')).resolves.toMatchObject({ labelReady: true, canBuy: false });
  expect(network.mock.calls.filter(([path]) => path.endsWith('/buy'))).toHaveLength(1);
});
test('advanceShipment refreshes status and never buys a label', async () => {
  await operate(order.id, 'create');
  expect(network.mock.calls.some(([path]) => path.endsWith('/buy'))).toBe(false);
  await expect(advanceShipment(order.id)).resolves.toMatchObject({ shipmentId: '456', labelReady: false, canBuy: true });
  expect(network.mock.calls.filter(([path]) => path.endsWith('/buy'))).toHaveLength(0);
  expect(sendShipmentPreparedEmail).not.toHaveBeenCalled();
});
test('ensureShipment creates the shipment and never buys a label', async () => {
  await expect(ensureShipment(order.id)).resolves.toMatchObject({
    skipped: false, shipment: { shipmentId: '456', labelReady: false, canBuy: true },
  });
  expect(network.mock.calls.filter(([path]) => path.endsWith('/buy'))).toHaveLength(0);
  expect(sendShipmentPreparedEmail).not.toHaveBeenCalled();
});
test('ensureShipment skips unpaid or digital orders', async () => {
  order.status = 'pending';
  await expect(ensureShipment(order.id)).resolves.toEqual({ skipped: true });
  order.status = 'succeeded';
  order.metadata = { ...order.metadata, inpostDelivery: undefined };
  await expect(ensureShipment(order.id)).resolves.toEqual({ skipped: true });
  expect(network).not.toHaveBeenCalled();
});
test('ensureShipment records a create failure without throwing', async () => {
  network.mockRejectedValueOnce(Object.assign(new Error('timeout'), { providerStatus: 504 }));
  await expect(ensureShipment(order.id)).resolves.toMatchObject({ skipped: false, error: 'timeout' });
});
test('createMissingShipments creates paid InPost orders that have no shipment row', async () => {
  const realQuery = db.query.getMockImplementation();
  db.query.mockImplementation(async (sql, a) => {
    if (sql.includes('LEFT JOIN order_inpost_shipments')) return [[{ id: order.id }]];
    return realQuery(sql, a);
  });
  await expect(createMissingShipments()).resolves.toEqual({ skipped: false, created: 1, failed: 0 });
  expect(network.mock.calls.some(([path]) => path.includes('/organizations/') && path.endsWith('/shipments'))).toBe(true);
  expect(network.mock.calls.filter(([path]) => path.endsWith('/buy'))).toHaveLength(0);
});
test('panel generate buys a label after auto-create without buying twice', async () => {
  await ensureShipment(order.id);
  expect(network.mock.calls.filter(([path]) => path.endsWith('/buy'))).toHaveLength(0);
  await expect(operate(order.id, 'generate')).resolves.toMatchObject({ labelReady: true, canBuy: false });
  expect(network.mock.calls.filter(([path]) => path.endsWith('/buy'))).toHaveLength(1);
});
test('markDispatched sets shipped and emails the customer once', async () => {
  await operate(order.id, 'generate');
  await expect(markDispatched(order.id)).resolves.toMatchObject({
    dispatched: true, shippedEmail: 'sent', trackingNumber: '123456789012345678901234',
  });
  expect(sendShippingEmailForOrder).toHaveBeenCalledWith(expect.objectContaining({
    trackingNumber: '123456789012345678901234',
  }), 'admin');
  sendShippingEmailForOrder.mockResolvedValueOnce({ sent: 0, failed: 0, skipped: true, results: [] });
  EmailSend.hasSuccessfulOrderEmail.mockResolvedValue(true);
  await expect(markDispatched(order.id)).resolves.toMatchObject({ shippedEmail: 'skipped' });
});
test('markDispatched refuses to ship before the label is paid', async () => {
  await operate(order.id, 'create');
  await expect(markDispatched(order.id)).rejects.toThrow('Najpierw wygeneruj etykietę');
  expect(sendShippingEmailForOrder).not.toHaveBeenCalled();
});
test('get and refresh succeed before a shipment exists', async () => {
  await expect(operate(order.id, 'get')).resolves.toMatchObject({
    shipmentId: null, state: 'not_created', labelReady: false, canBuy: false, needsReview: false,
  });
  await expect(operate(order.id, 'refresh')).resolves.toMatchObject({
    shipmentId: null, state: 'not_created',
  });
  expect(network).not.toHaveBeenCalled();
});
test('refresh saves live status even when InPost parcel snapshot drifted', async () => {
  await operate(order.id, 'create');
  remote.status = 'confirmed';
  remote.tracking_number = '123456789012345678901234';
  remote.parcels = [{ template: 'large', weight: { amount: 99 } }];
  await expect(operate(order.id, 'refresh')).resolves.toMatchObject({
    providerStatus: 'confirmed',
    trackingNumber: '123456789012345678901234',
    needsReview: false,
    labelReady: true,
  });
});
test('refresh maps database errors to a retryable 503', async () => {
  await operate(order.id, 'create');
  const realQuery = db.query.getMockImplementation();
  db.query.mockImplementation(async (sql, a) => {
    if (sql.includes('SET remote = ?') && !sql.includes('SET shipment_id')) {
      const err = new Error("Data too long for column 'inpost_status'");
      err.code = 'ER_DATA_TOO_LONG';
      throw err;
    }
    return realQuery(sql, a);
  });
  await expect(operate(order.id, 'refresh')).rejects.toMatchObject({ status: 503 });
});
test.each(['pending', 'canceled'])('unpaid %s order cannot buy or create', async status => {
  order.status = status;
  await expect(operate(order.id, 'create')).rejects.toMatchObject({ status: 409 });
  expect(network).not.toHaveBeenCalled();
});
test('environment and organization cannot be changed for an existing paid order', async () => {
  process.env.INPOST_ORGANIZATION_ID = '999';
  await expect(operate(order.id, 'create')).rejects.toThrow('innego środowiska');
  expect(network).not.toHaveBeenCalled();
});
test('changed recipient in database blocks shipment before network', async () => {
  order.metadata.inpostDelivery.receiver.phone = '500000000';
  await expect(operate(order.id, 'create')).rejects.toThrow('Dane zamówienia');
  expect(network).not.toHaveBeenCalled();
});
test.each(['reference', 'receiver', 'parcels'])('reconciliation rejects another order: %s', async field => {
  network.mockRejectedValueOnce(new Error('timeout'));
  await expect(operate(order.id, 'create')).rejects.toThrow();
  if (field === 'reference') remote.reference = 'other';
  if (field === 'receiver') remote.receiver = { ...remote.receiver, email: 'other@example.com' };
  if (field === 'parcels') remote.parcels = [];
  await expect(operate(order.id, 'reconcile', { shipmentId: 456 })).rejects.toThrow('nie odpowiada');
  expect(row.shipment_id).toBeUndefined();
});

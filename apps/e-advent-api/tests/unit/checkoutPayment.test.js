jest.mock('../../config/database', () => ({ query: jest.fn(), withTransaction: jest.fn(), withNamedLocks: jest.fn() }));
jest.mock('../../models/Payment', () => require('../mocks/Payment'));
jest.mock('../../models/Calendar', () => require('../mocks/Calendar'));
jest.mock('../../config/stripe', () => ({ paymentIntents: { create: jest.fn(), retrieve: jest.fn(), cancel: jest.fn() } }));
const { initializeCheckout } = require('../../services/checkoutPayment');
const { pendingCalendar } = require('../helpers/createTestApp');
const Calendar = require('../../models/Calendar');
const Payment = require('../../models/Payment');
const stripe = require('../../config/stripe');
const db = require('../../config/database');
const setup = require('../helpers/checkoutStore');

const configureInpost = require('../helpers/inpostFixture');
const request = {
  delivery: configureInpost(),
  checkoutToken: 'a'.repeat(64), orderId: 'browser-reference', amount: 34, currency: 'pln',
  customerEmail: 'buyer@example.com', items: [{ sku: 'santa-letter', quantity: 1 }],
  shippingAddress: { firstName: 'Anna', lastName: 'Nowak', buildingNumber: '1', fullName: 'Anna Nowak', street: 'Ulica', city: 'Warszawa', postalCode: '00-001', phone: '500600700' },
};
describe('checkout identity and concurrency', () => {
  let store;
  beforeEach(() => {
    jest.clearAllMocks();
    request.delivery = configureInpost();
    store = setup();
    Calendar.findCalendarById.mockResolvedValue(pendingCalendar({ sku: 'interactive', id: 'cal' }));
  });
  test('UUID links Stripe and DB; readable order number stays separate', async () => {
    const result = await initializeCheckout(request, 'test');
    const order = store.orders.get(result.orderId);
    const intent = store.intents.get(result.paymentIntentId);
    expect(result.orderId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.orderId).not.toBe(request.orderId);
    expect(result.orderNumber).toBe('000001');
    expect(intent.metadata).toMatchObject({ orderId: order.id, orderNumber: '000001', customerEmail: order.customerEmail });
    expect(intent.key).toBe(`order:${order.id}`);
  });
  test('simultaneous retries produce one order, number and PaymentIntent', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => initializeCheckout(request, 'test')));
    expect(new Set(results.map(result => result.paymentIntentId)).size).toBe(1);
    expect(store.orders.size).toBe(1);
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
  });
  test('two customers with the same amount and client reference never share a payment', async () => {
    const results = await Promise.all([initializeCheckout(request, 'test'), initializeCheckout({ ...request, checkoutToken: 'b'.repeat(64), customerEmail: 'other@example.com' }, 'test')]);
    expect(results[0].orderId).not.toBe(results[1].orderId);
    expect(results[0].paymentIntentId).not.toBe(results[1].paymentIntentId);
    expect(results.map(result => store.orders.get(result.orderId).customerEmail)).toEqual(['buyer@example.com', 'other@example.com']);
  });
  test('same calendar cannot be charged by concurrent checkouts even with the same email', async () => {
    const calRequest = { ...request, amount: 9, items: [{ calendarId: 'cal', editToken: 'test-edit-token' }] };
    const results = await Promise.allSettled([initializeCheckout(calRequest, 'test'), initializeCheckout({ ...calRequest, checkoutToken: 'b'.repeat(64) }, 'test')]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(store.orders.size).toBe(1);
    expect(store.intents.size).toBe(1);
  });
  test('changing address cancels old intent and preserves its order snapshot', async () => {
    const first = await initializeCheckout(request, 'test');
    const second = await initializeCheckout({ ...request, shippingAddress: { ...request.shippingAddress, buildingNumber: '2' } }, 'test');
    expect(second.orderId).not.toBe(first.orderId);
    expect(store.intents.get(first.paymentIntentId).status).toBe('canceled');
    expect(store.orders.get(first.orderId).shippingAddress.street).toBe('Ulica 1');
    expect(store.orders.get(second.orderId).shippingAddress.street).toBe('Ulica 2');
  });
  test.each(['processing', 'succeeded'])('does not replace a %s payment', async status => {
    const first = await initializeCheckout(request, 'test');
    store.intents.get(first.paymentIntentId).status = status;
    await expect(initializeCheckout({ ...request, customerEmail: 'other@example.com' }, 'test')).rejects.toMatchObject({ status: 409 });
    expect(store.orders.size).toBe(1);
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  });
  test('retries recover the same intent after a DB binding failure', async () => {
    const realQuery = db.query.getMockImplementation();
    let fail = true;
    db.query.mockImplementation((sql, args) => {
      if (sql.startsWith('UPDATE orders SET stripe_payment_intent_id') && fail) { fail = false; throw new Error('connection lost'); }
      return realQuery(sql, args);
    });
    await expect(initializeCheckout(request, 'test')).rejects.toThrow('connection lost');
    const result = await initializeCheckout(request, 'test');
    expect(store.orders.size).toBe(1);
    expect(store.intents.size).toBe(1);
    expect(result.paymentIntentId).toBe('pi_1');
  });
  test('does not create Stripe payment if order could not be saved', async () => {
    Payment.createPayment.mockRejectedValueOnce(new Error('DB down'));
    await expect(initializeCheckout(request, 'test')).rejects.toThrow('DB down');
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });
  test('rejects mismatched Stripe customer without returning a client secret', async () => {
    const first = await initializeCheckout(request, 'test');
    store.intents.get(first.paymentIntentId).metadata.customerEmail = 'wrong@example.com';
    await expect(initializeCheckout(request, 'test')).rejects.toThrow('identity mismatch');
  });
  test('does not guess after Stripe idempotency retention has expired', async () => {
    stripe.paymentIntents.create.mockRejectedValueOnce(new Error('timeout'));
    await expect(initializeCheckout(request, 'test')).rejects.toThrow('timeout');
    [...store.orders.values()][0].createdAt = '2020-01-01';
    await expect(initializeCheckout(request, 'test')).rejects.toMatchObject({ status: 409 });
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
  });
  test('duplicate calendar lines are rejected before saving any order', async () => {
    const item = { calendarId: 'cal', editToken: 'test-edit-token' };
    await expect(initializeCheckout({ ...request, amount: 18, items: [item, item] }, 'test')).rejects.toThrow('only once');
    expect(store.orders.size).toBe(0);
  });
});

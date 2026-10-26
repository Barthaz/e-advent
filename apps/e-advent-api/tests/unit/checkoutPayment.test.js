jest.mock('../../config/database', () => ({ query: jest.fn(), withTransaction: jest.fn(), withNamedLocks: jest.fn() }));
jest.mock('../../models/Payment', () => require('../mocks/Payment'));
jest.mock('../../models/Calendar', () => require('../mocks/Calendar'));
jest.mock('../../config/stripe', () => ({ paymentIntents: { create: jest.fn(), retrieve: jest.fn(), update: jest.fn(), cancel: jest.fn() } }));
jest.mock('../../services/paymentFulfillment', () => ({
  fulfillFreeOrder: jest.fn(async (orderId) => ({ duplicate: false, orderId })),
  fulfillPaidIntent: jest.fn(),
  redeemOrderDiscount: jest.fn(),
}));
const { initializeCheckout } = require('../../services/checkoutPayment');
const { pendingCalendar } = require('../helpers/createTestApp');
const Calendar = require('../../models/Calendar');
const Payment = require('../../models/Payment');
const stripe = require('../../config/stripe');
const db = require('../../config/database');
const setup = require('../helpers/checkoutStore');
const { fulfillFreeOrder } = require('../../services/paymentFulfillment');
const { discountRow, installDiscountStore } = require('../helpers/discountFixture');

const configureInpost = require('../helpers/inpostFixture');
const request = {
  delivery: configureInpost(),
  checkoutToken: 'a'.repeat(64), orderId: 'browser-reference', amount: 34, currency: 'pln',
  customerEmail: 'buyer@example.com', items: [{ sku: 'santa-letter', quantity: 1 }],
  shippingAddress: { firstName: 'Anna', lastName: 'Nowak', buildingNumber: '1', fullName: 'Anna Nowak', street: 'Ulica', city: 'Warszawa', postalCode: '00-001', phone: '500600700' },
};
const acceptedAt = '2026-10-24T15:00:00.000Z';
function pay(req = request) {
  return {
    ...req,
    acceptanceData: {
      termsAccepted: true,
      privacyAccepted: true,
      termsAcceptedAt: acceptedAt,
      privacyAcceptedAt: acceptedAt,
      clientIP: '1.2.3.4',
    },
  };
}
describe('checkout identity and concurrency', () => {
  let store;
  beforeEach(() => {
    jest.clearAllMocks();
    request.delivery = configureInpost();
    store = setup();
    Calendar.findCalendarById.mockResolvedValue(pendingCalendar({ sku: 'interactive', id: 'cal' }));
  });
  test('preparing payment does not insert an order', async () => {
    const result = await initializeCheckout(request, 'test');
    const intent = store.intents.get(result.paymentIntentId);
    expect(result.orderId).toBeNull();
    expect(result.orderNumber).toBeNull();
    expect(store.orders.size).toBe(0);
    expect(intent.metadata.orderId).toBeUndefined();
    expect(intent.metadata.customerEmail).toBe('buyer@example.com');
    expect(intent.key).toMatch(/^checkout:[a-f0-9]{64}:[a-f0-9]{64}$/);
    expect(Payment.createPayment).not.toHaveBeenCalled();
  });
  test('pay click inserts one order and stamps the PaymentIntent', async () => {
    const prepared = await initializeCheckout(request, 'test');
    const result = await initializeCheckout(pay(request), 'test');
    const order = store.orders.get(result.orderId);
    const intent = store.intents.get(result.paymentIntentId);
    expect(result.paymentIntentId).toBe(prepared.paymentIntentId);
    expect(result.orderId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.orderId).not.toBe(request.orderId);
    expect(result.orderNumber).toBe('000001');
    expect(store.orders.size).toBe(1);
    expect(intent.metadata).toMatchObject({ orderId: order.id, orderNumber: '000001', customerEmail: order.customerEmail });
    expect(order.stripePaymentIntentId).toBe(intent.id);
    expect(order.clientIP).toBe('test');
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
  });
  test('simultaneous retries produce one PaymentIntent and no extra orders', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => initializeCheckout(request, 'test')));
    expect(new Set(results.map(result => result.paymentIntentId)).size).toBe(1);
    expect(results.every(result => result.orderId === null)).toBe(true);
    expect(store.orders.size).toBe(0);
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
  });
  test('simultaneous pay clicks produce one order, number and PaymentIntent', async () => {
    await initializeCheckout(request, 'test');
    const results = await Promise.all(Array.from({ length: 8 }, () => initializeCheckout(pay(request), 'test')));
    expect(new Set(results.map(result => result.paymentIntentId)).size).toBe(1);
    expect(new Set(results.map(result => result.orderId)).size).toBe(1);
    expect(store.orders.size).toBe(1);
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
  });
  test('two customers with the same amount and client reference never share a payment', async () => {
    const results = await Promise.all([
      initializeCheckout(pay(request), 'test'),
      initializeCheckout(pay({ ...request, checkoutToken: 'b'.repeat(64), customerEmail: 'other@example.com' }), 'test'),
    ]);
    expect(results[0].orderId).not.toBe(results[1].orderId);
    expect(results[0].paymentIntentId).not.toBe(results[1].paymentIntentId);
    expect(results.map(result => store.orders.get(result.orderId).customerEmail)).toEqual(['buyer@example.com', 'other@example.com']);
  });
  test('same calendar can be prepared twice until someone actually pays', async () => {
    const calRequest = { ...request, amount: 9, items: [{ calendarId: 'cal', editToken: 'test-edit-token' }] };
    const prepared = await Promise.all([
      initializeCheckout(calRequest, 'test'),
      initializeCheckout({ ...calRequest, checkoutToken: 'b'.repeat(64) }, 'test'),
    ]);
    expect(prepared.every(result => result.orderId === null)).toBe(true);
    expect(store.orders.size).toBe(0);
    expect(store.intents.size).toBe(2);
    const paid = await Promise.allSettled([
      initializeCheckout(pay(calRequest), 'test'),
      initializeCheckout(pay({ ...calRequest, checkoutToken: 'b'.repeat(64) }), 'test'),
    ]);
    expect(paid.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(store.orders.size).toBe(1);
  });
  test('changing address cancels unused intent without creating orders', async () => {
    const first = await initializeCheckout(request, 'test');
    const second = await initializeCheckout({ ...request, shippingAddress: { ...request.shippingAddress, buildingNumber: '2' } }, 'test');
    expect(first.orderId).toBeNull();
    expect(second.orderId).toBeNull();
    expect(second.paymentIntentId).not.toBe(first.paymentIntentId);
    expect(store.intents.get(first.paymentIntentId).status).toBe('canceled');
    expect(store.orders.size).toBe(0);
  });
  test('changing address after pay cancels the unpaid order and preserves its snapshot', async () => {
    const first = await initializeCheckout(pay(request), 'test');
    const second = await initializeCheckout({
      ...request,
      shippingAddress: { ...request.shippingAddress, buildingNumber: '2' },
    }, 'test');
    const committed = await initializeCheckout(pay({
      ...request,
      shippingAddress: { ...request.shippingAddress, buildingNumber: '2' },
    }), 'test');
    expect(second.orderId).toBeNull();
    expect(committed.orderId).not.toBe(first.orderId);
    expect(store.intents.get(first.paymentIntentId).status).toBe('canceled');
    expect(store.orders.get(first.orderId).status).toBe('canceled');
    expect(store.orders.get(first.orderId).shippingAddress.street).toBe('Ulica 1');
    expect(store.orders.get(committed.orderId).shippingAddress.street).toBe('Ulica 2');
  });
  test('does not replace a processing payment', async () => {
    const first = await initializeCheckout(pay(request), 'test');
    store.intents.get(first.paymentIntentId).status = 'processing';
    await expect(initializeCheckout({ ...request, customerEmail: 'other@example.com' }, 'test')).rejects.toMatchObject({ status: 409 });
    expect(store.orders.size).toBe(1);
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  });
  test('a completed payment does not block the next checkout in the same browser session', async () => {
    const first = await initializeCheckout(pay(request), 'test');
    store.intents.get(first.paymentIntentId).status = 'succeeded';
    store.orders.get(first.orderId).status = 'succeeded';
    const second = await initializeCheckout({ ...request, customerEmail: 'other@example.com' }, 'test');
    expect(second.orderId).toBeNull();
    expect(second.paymentIntentId).not.toBe(first.paymentIntentId);
    expect(store.intents.get(first.paymentIntentId).status).toBe('succeeded');
    expect(store.orders.get(first.orderId).status).toBe('succeeded');
    expect(store.orders.size).toBe(1);
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  });
  test('retries recover the same intent after order insert fails on pay', async () => {
    await initializeCheckout(request, 'test');
    Payment.createPayment.mockRejectedValueOnce(new Error('connection lost'));
    await expect(initializeCheckout(pay(request), 'test')).rejects.toThrow('connection lost');
    const result = await initializeCheckout(pay(request), 'test');
    expect(store.orders.size).toBe(1);
    expect(store.intents.size).toBe(1);
    expect(result.paymentIntentId).toBe('pi_1');
    expect(result.orderId).toMatch(/^[0-9a-f-]{36}$/);
  });
  test('prepare still creates Stripe payment without inserting an order', async () => {
    const result = await initializeCheckout(request, 'test');
    expect(result.clientSecret).toBeTruthy();
    expect(result.orderId).toBeNull();
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
    expect(store.orders.size).toBe(0);
    expect(Payment.createPayment).not.toHaveBeenCalled();
  });
  test('pay click fails closed when the order cannot be saved', async () => {
    await initializeCheckout(request, 'test');
    Payment.createPayment.mockRejectedValueOnce(new Error('DB down'));
    await expect(initializeCheckout(pay(request), 'test')).rejects.toThrow('DB down');
    expect(store.orders.size).toBe(0);
  });
  test('rejects mismatched Stripe customer without returning a client secret', async () => {
    const first = await initializeCheckout(request, 'test');
    store.intents.get(first.paymentIntentId).metadata.customerEmail = 'wrong@example.com';
    await expect(initializeCheckout(request, 'test')).rejects.toThrow('identity mismatch');
  });
  test('retries Stripe after a draft create timeout without leaving an order', async () => {
    stripe.paymentIntents.create.mockRejectedValueOnce(new Error('timeout'));
    await expect(initializeCheckout(request, 'test')).rejects.toThrow('timeout');
    expect(store.orders.size).toBe(0);
    const result = await initializeCheckout(request, 'test');
    expect(result.paymentIntentId).toBeTruthy();
    expect(result.orderId).toBeNull();
    expect(store.orders.size).toBe(0);
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(2);
  });
  test('duplicate calendar lines are rejected before saving any order', async () => {
    const item = { calendarId: 'cal', editToken: 'test-edit-token' };
    await expect(initializeCheckout({ ...request, amount: 18, items: [item, item] }, 'test')).rejects.toThrow('only once');
    expect(store.orders.size).toBe(0);
  });
  test('10% code discounts products and keeps shipping', async () => {
    installDiscountStore(db.query, [discountRow({ code: 'SAVE10', percent: 10, reusable: 1 })]);
    const prepared = await initializeCheckout({ ...request, amount: 31.1, promoCode: 'SAVE10' }, 'test');
    expect(prepared.amount).toBe(31.1);
    expect(prepared.orderId).toBeNull();
    expect(store.orders.size).toBe(0);
    const result = await initializeCheckout(pay({ ...request, amount: 31.1, promoCode: 'SAVE10' }), 'test');
    expect(store.orders.get(result.orderId).rabat).toBe('SAVE10');
    expect(store.orders.get(result.orderId).amount).toBe(31.1);
    expect(store.orders.get(result.orderId).shippingAmount).toBe(5);
    expect(store.orders.get(result.orderId).items[0]).toMatchObject({
      sku: 'santa-letter',
      unitPrice: 26.1,
      lineBrutto: 26.1,
    });
  });
  test('20% code discounts products and keeps shipping', async () => {
    installDiscountStore(db.query, [discountRow({ code: 'MIKOLAJ20', percent: 20, reusable: 1 })]);
    const result = await initializeCheckout(pay({ ...request, amount: 28.2, promoCode: 'MIKOLAJ20' }), 'test');
    expect(result.amount).toBe(28.2);
    expect(store.orders.get(result.orderId).rabat).toBe('MIKOLAJ20');
    expect(store.orders.get(result.orderId).shippingAmount).toBe(5);
    expect(store.orders.get(result.orderId).items[0]).toMatchObject({
      sku: 'santa-letter',
      unitPrice: 23.2,
      lineBrutto: 23.2,
    });
  });
  test('calendar checkout is rejected while the November sale is closed', async () => {
    const previous = process.env.EADVENT_CALENDARS_ON_SALE;
    process.env.EADVENT_CALENDARS_ON_SALE = '0';
    try {
      await expect(initializeCheckout({
        ...request,
        amount: 9,
        items: [{ calendarId: 'cal', editToken: 'test-edit-token' }],
      }, 'test')).rejects.toMatchObject({ status: 400 });
      expect(store.orders.size).toBe(0);
    } finally {
      process.env.EADVENT_CALENDARS_ON_SALE = previous;
    }
  });
  test('95% code charges 5% of products and shipping through Stripe', async () => {
    installDiscountStore(db.query, [discountRow({ code: 'SMOKE95X', percent: 95, reusable: 1 })]);
    const prepared = await initializeCheckout({ ...request, amount: 1.7, promoCode: 'SMOKE95X' }, 'test');
    expect(prepared.amount).toBe(1.7);
    expect(prepared.clientSecret).toBeTruthy();
    expect(prepared.orderId).toBeNull();
    const result = await initializeCheckout(pay({ ...request, amount: 1.7, promoCode: 'SMOKE95X' }), 'test');
    expect(store.orders.get(result.orderId).rabat).toBe('SMOKE95X');
    expect(store.orders.get(result.orderId).amount).toBe(1.7);
    expect(store.orders.get(result.orderId).shippingAmount).toBe(0.25);
    expect(stripe.paymentIntents.create).toHaveBeenCalled();
    expect(fulfillFreeOrder).not.toHaveBeenCalled();
  });

  test('100% code fulfills without contacting Stripe', async () => {
    installDiscountStore(db.query, [discountRow({ code: 'FREE100', percent: 100, reusable: 1 })]);
    const result = await initializeCheckout({ ...request, amount: 0, promoCode: 'FREE100' }, 'test');
    expect(result).toMatchObject({ free: true, amount: 0, clientSecret: null, paymentIntentId: null });
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(fulfillFreeOrder).toHaveBeenCalledWith(result.orderId);
  });
  test('rejects an unknown promo code before creating an order', async () => {
    installDiscountStore(db.query, []);
    await expect(initializeCheckout({ ...request, promoCode: 'NOPE12' }, 'test')).rejects.toMatchObject({ status: 400 });
    expect(store.orders.size).toBe(0);
  });
  test('stores required terms and privacy acceptance on the order', async () => {
    const result = await initializeCheckout(pay(request), 'test');
    const order = store.orders.get(result.orderId);
    expect(order.termsAcceptedAt).toBe(acceptedAt);
    expect(order.privacyPolicyAcceptedAt).toBe(acceptedAt);
    expect(order.clientIP).toBe('test');
  });
});

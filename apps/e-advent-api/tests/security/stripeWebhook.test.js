jest.mock('../../config/database', () => ({ query: jest.fn(), getPool: jest.fn(), connectDB: jest.fn().mockResolvedValue(undefined), withTransaction: jest.fn(), withNamedLocks: jest.fn() }));
jest.mock('../../services/paymentFulfillment', () => ({ fulfillPaidIntent: jest.fn(), redeemOrderDiscount: jest.fn(), fulfillFreeOrder: jest.fn() }));
jest.mock('../../services/orderEmailJobs', () => ({ deliverOrderEmails: jest.fn(), retryOrderEmails: jest.fn() }));
jest.mock('../../services/inpostFulfillment', () => ({
  operate: jest.fn(),
  markLabelPrepared: jest.fn(),
  markDispatched: jest.fn(),
  syncActiveShipments: jest.fn(),
  createMissingShipments: jest.fn(),
  ensureShipment: jest.fn().mockResolvedValue({ skipped: true }),
  advanceShipment: jest.fn(),
}));
jest.mock('../../models/Payment', () => require('../mocks/Payment'));
jest.mock('../../config/stripe', () => {
  const Stripe = jest.requireActual('stripe');
  const offline = new Stripe('sk_test_offline');
  return { webhooks: offline.webhooks, paymentIntents: { retrieve: jest.fn() } };
});
const { request, loadApp } = require('../helpers/createTestApp');
const stripe = require('../../config/stripe');
const Payment = require('../../models/Payment');
const { fulfillPaidIntent, redeemOrderDiscount } = require('../../services/paymentFulfillment');
const { deliverOrderEmails } = require('../../services/orderEmailJobs');
const { ensureShipment } = require('../../services/inpostFulfillment');
const app = loadApp();
const secret = 'whsec_offline_test_only';
beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  fulfillPaidIntent.mockResolvedValue({ orderId: 'canonical-order-uuid', duplicate: false, rabatCode: null, email: 'buyer@example.com' });
  redeemOrderDiscount.mockResolvedValue(undefined);
  deliverOrderEmails.mockResolvedValue({ sent: 1, failed: 0 });
  ensureShipment.mockResolvedValue({ skipped: true });
});
function post(type = 'payment_intent.succeeded', tamper = false) {
  const payload = JSON.stringify({ id: 'evt_signed', type, data: { object: { id: 'pi_signed' } } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return request(app).post('/api/v1/stripe/webhook').set('Content-Type', 'application/json')
    .set('Stripe-Signature', signature).send(tamper ? payload.replace('pi_signed', 'pi_changed') : payload);
}
test('real Stripe signature verification receives raw bytes and dispatches by database UUID', async () => {
  expect((await post()).status).toBe(200);
  expect(fulfillPaidIntent).toHaveBeenCalledWith({ id: 'pi_signed' });
  expect(ensureShipment).toHaveBeenCalledWith('canonical-order-uuid');
  expect(deliverOrderEmails).toHaveBeenCalledWith('canonical-order-uuid');
});
test('a changed body cannot activate or deliver any order', async () => {
  expect((await post(undefined, true)).status).toBe(400);
  expect(fulfillPaidIntent).not.toHaveBeenCalled();
  expect(ensureShipment).not.toHaveBeenCalled();
  expect(deliverOrderEmails).not.toHaveBeenCalled();
});
test('SMTP failure asks Stripe to retry without falsely reporting delivery success', async () => {
  deliverOrderEmails.mockRejectedValueOnce(new Error('SMTP unavailable'));
  expect((await post()).status).toBe(500);
  expect(ensureShipment).toHaveBeenCalledWith('canonical-order-uuid');
  expect((await post()).status).toBe(200);
  expect(deliverOrderEmails).toHaveBeenCalledTimes(2);
  expect(ensureShipment).toHaveBeenCalledTimes(2);
});
test('InPost auto-create failure does not block payment confirmation', async () => {
  ensureShipment.mockRejectedValueOnce(new Error('ShipX timeout'));
  expect((await post()).status).toBe(200);
  expect(deliverOrderEmails).toHaveBeenCalledWith('canonical-order-uuid');
});
test('late failure event does not downgrade a successful payment', async () => {
  stripe.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_signed', status: 'succeeded' });
  expect((await post('payment_intent.payment_failed')).status).toBe(200);
  expect(Payment.updatePaymentStatus).not.toHaveBeenCalled();
});

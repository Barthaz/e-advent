jest.mock('../../services/paymentFulfillment', () => ({ fulfillPaidIntent: jest.fn() }));
jest.mock('../../config/database', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  getPool: jest.fn(() => ({
    getConnection: jest.fn().mockResolvedValue({
      ping: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    }),
  })),
  query: jest.fn().mockResolvedValue([[], []]),
  withTransaction: jest.fn(fn => fn()),
  withNamedLocks: jest.fn((keys, fn) => fn()),
  closeConnection: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../models/Calendar', () => require('../mocks/Calendar'));
jest.mock('../../models/Payment', () => require('../mocks/Payment'));
jest.mock('../../config/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
}));
jest.mock('../../config/stripe', () => ({
  paymentIntents: {
    create: jest.fn(),
    cancel: jest.fn(),
    update: jest.fn(),
    retrieve: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  customers: {
    list: jest.fn().mockResolvedValue({ data: [] }),
  },
}));

const { request, loadApp, pendingCalendar } = require('../helpers/createTestApp');
const Calendar = require('../../models/Calendar');
const Payment = require('../../models/Payment');
const stripe = require('../../config/stripe');
const { sendEmail } = require('../../config/email');


const { fulfillPaidIntent } = require('../../services/paymentFulfillment');
describe('audit regression protections', () => {
 const app = loadApp();
 beforeEach(() => { jest.clearAllMocks(); require('../helpers/checkoutStore')(); Calendar.findCalendarById.mockResolvedValue(pendingCalendar({sku:'interactive'})); Payment.findPayments.mockResolvedValue([]); });
 test('cannot activate another calendar without its edit token', async () => {
   const res=await request(app).post('/api/v1/calendars/createFree').send({calendarId:'cal',email:'buyer@example.com',promoCode:'rabat100'});
   expect(res.status).toBe(403); expect(Calendar.updateCalendar).not.toHaveBeenCalled();
 });
 test('cannot redirect recovery credentials to another mailbox', async () => {
   const res=await request(app).post('/api/v1/calendars/createFree').send({calendarId:'cal',email:'attacker@example.com',promoCode:'rabat100',editToken:'test-edit-token'});
   expect(res.status).toBe(400); expect(sendEmail).not.toHaveBeenCalled();
 });
 test('checkout does not expose a secret when persistence fails', async () => {
   stripe.paymentIntents.create.mockResolvedValue({id:'pi_new',client_secret:'secret',amount:900,currency:'pln'});
   Payment.createPayment.mockRejectedValue(new Error('database down'));
   const res=await request(app).post('/api/v1/stripe/create-payment-intent').send({data:{checkoutToken:'a'.repeat(64),amount:9,customerEmail:'buyer@example.com',orderId:'order',productId:'cal',editToken:'test-edit-token'}});
   expect(res.status).toBe(503); expect(res.body.clientSecret).toBeUndefined();
 });
 test('webhook database failure asks Stripe to retry', async () => {
   stripe.webhooks.constructEvent.mockReturnValue({id:'evt',type:'payment_intent.succeeded',data:{object:{id:'pi'}}});
   fulfillPaidIntent.mockRejectedValue(new Error('database down'));
   const res=await request(app).post('/api/v1/stripe/webhook').set('Content-Type','application/json').send('{}');
   expect(res.status).toBe(500);
 });
 test('confirmation cannot mutate order status', async () => {
   stripe.paymentIntents.retrieve.mockResolvedValue({id:'pi',status:'succeeded',client_secret:'secret'});
   const res=await request(app).post('/api/v1/stripe/confirm-payment').send({paymentIntentId:'pi',clientSecret:'secret'});
   expect(res.status).toBe(200); expect(Payment.updatePaymentStatus).not.toHaveBeenCalled();
 });
 test('payment id alone cannot expose customer details', async () => {
   Payment.findPaymentByStripeId.mockResolvedValue({id:'order',customerEmail:'private@example.com'});
   stripe.paymentIntents.retrieve.mockResolvedValue({id:'pi',client_secret:'secret'});
   const res=await request(app).get('/api/v1/stripe/payment/pi');
   expect(res.status).toBe(403); expect(res.body.payment).toBeUndefined();
 });
 test('pending calendar cannot open days', async () => {
   const res=await request(app).put('/api/v1/calendars/cal/open/1');
   expect(res.status).toBe(403); expect(Calendar.openTask).not.toHaveBeenCalled();
 });
});

describe('free activation payment handling', () => {
 const app = loadApp();
 beforeEach(() => { jest.clearAllMocks(); Calendar.findCalendarById.mockResolvedValue(pendingCalendar({sku:'interactive'})); Calendar.updateCalendar.mockResolvedValue(pendingCalendar({status:'succeeded',sku:'interactive'})); });
 test('cancels an unpaid intent without zeroing a paid order', async () => {
   Payment.findPayments.mockResolvedValue([{stripePaymentIntentId:'pi',items:[{calendarId:'cal'}]}]);
   stripe.paymentIntents.retrieve.mockResolvedValue({id:'pi',status:'requires_payment_method'});
   stripe.paymentIntents.cancel.mockResolvedValue({status:'canceled'});
   const res=await request(app).post('/api/v1/calendars/createFree').send({calendarId:'cal',email:'buyer@example.com',promoCode:'rabat100',editToken:'test-edit-token'});
   expect(res.status).toBe(200);
   expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi');
   expect(Payment.updatePaymentStatus).toHaveBeenCalledWith('pi','canceled');
   expect(Payment.updatePaymentByProductId).not.toHaveBeenCalled();
   expect(res.body.accessCode).toBeUndefined();
 });
 test('does not activate when Stripe cancellation fails', async () => {
   Payment.findPayments.mockResolvedValue([{stripePaymentIntentId:'pi',items:[{calendarId:'cal'}]}]);
   stripe.paymentIntents.cancel.mockRejectedValue(new Error('payment already processing'));
   const res=await request(app).post('/api/v1/calendars/createFree').send({calendarId:'cal',email:'buyer@example.com',promoCode:'rabat100',editToken:'test-edit-token'});
   expect(res.status).toBe(500); expect(Calendar.updateCalendar).not.toHaveBeenCalled();
 });
});

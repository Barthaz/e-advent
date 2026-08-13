jest.mock('../../config/database', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  getPool: jest.fn(() => ({
    getConnection: jest.fn().mockResolvedValue({
      ping: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    }),
  })),
  query: jest.fn().mockResolvedValue([[], []]),
  withTransaction: jest.fn(),
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

describe('Faza 1 — payment bypass / promo (Pay-*)', () => {
  const app = loadApp();

  beforeEach(() => {
    jest.clearAllMocks();
    sendEmail.mockResolvedValue({ messageId: 'email-1' });
  });

  test('Pay-05: webhook without valid Stripe signature is rejected', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload');
    });

    const res = await request(app)
      .post('/api/v1/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=1,v1=invalid')
      .send(JSON.stringify({ type: 'payment_intent.succeeded' }));

    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Webhook Error/i);
  });

  test('Pay-06: confirm-payment with unknown PI does not activate calendar', async () => {
    stripe.paymentIntents.retrieve.mockRejectedValue(
      Object.assign(new Error('No such payment_intent'), { code: 'resource_missing', statusCode: 404 })
    );

    const res = await request(app)
      .post('/api/v1/stripe/confirm-payment')
      .send({ paymentIntentId: 'pi_fake_not_real' });

    expect([400, 404, 500]).toContain(res.status);
    expect(Calendar.updateCalendar).not.toHaveBeenCalled();
  });

  test('Pay-08: promocode rabat100 is valid; other codes are not', async () => {
    const ok = await request(app).get('/api/v1/promocodes/rabat100');
    expect(ok.status).toBe(200);
    expect(ok.body.valid).toBe(true);
    expect(ok.body.discount).toBe(100);

    const bad = await request(app).get('/api/v1/promocodes/not-a-real-code');
    expect(bad.status).toBe(200);
    expect(bad.body.valid).toBe(false);
    expect(bad.body.discount).toBe(0);
  });

  test('Pay-03: create with client status succeeded is forced to pending by API contract', async () => {
    Calendar.findCalendarById.mockResolvedValue(null);
    Calendar.createCalendar.mockImplementation(async () =>
      pendingCalendar({
        id: 'cal-spoof-status',
        status: 'pending',
        editToken: 'tok',
        data: { sku: 'interactive', productType: 'interactive', email: 'a@b.c', title: 'X', author: 'Y', tasks: [] },
      })
    );

    const res = await request(app)
      .post('/api/v1/calendars')
      .send({
        calendar: {
          title: 'X',
          author: 'Y',
          email: 'a@b.c',
          sku: 'interactive',
          productType: 'interactive',
          tasks: [],
          status: 'succeeded',
        },
      });

    expect(res.status).toBe(201);
    expect(Calendar.createCalendar).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.any(Object) })
    );
    const arg = Calendar.createCalendar.mock.calls[0][0];
    expect(arg.status).toBeUndefined();
    expect(res.body.calendar?.status).toBe('pending');
    expect(res.body.editToken).toBeTruthy();
  });
});

describe('Faza 1 — payment/price security (fixed)', () => {
  const app = loadApp();

  beforeEach(() => {
    jest.clearAllMocks();
    sendEmail.mockResolvedValue({ messageId: 'email-1' });
  });

  test('Pay-01: createFree without promo proof is rejected', async () => {
    Calendar.findCalendarById.mockResolvedValue(pendingCalendar({
      id: 'cal-free-1',
      sku: 'interactive',
      data: { sku: 'interactive', productType: 'interactive' },
    }));

    const res = await request(app)
      .post('/api/v1/calendars/createFree')
      .send({ calendarId: 'cal-free-1', email: 'attacker@example.com' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(Calendar.updateCalendar).not.toHaveBeenCalled();
  });

  test('Pay-01b: createFree with rabat100 on interactive pending succeeds', async () => {
    Calendar.findCalendarById.mockResolvedValue(pendingCalendar({
      id: 'cal-free-ok',
      sku: 'interactive',
      data: { sku: 'interactive', productType: 'interactive', title: 'T', email: 'a@b.c' },
    }));
    Calendar.updateCalendar.mockResolvedValue(
      pendingCalendar({
        id: 'cal-free-ok',
        status: 'succeeded',
        isFree: true,
        accessCode: 'ABC123',
        data: { sku: 'interactive', productType: 'interactive', title: 'T' },
      })
    );
    Payment.findPayments.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v1/calendars/createFree')
      .send({ calendarId: 'cal-free-ok', email: 'buyer@example.com', promoCode: 'rabat100' });

    expect(res.status).toBe(200);
    expect(res.body.accessCode).toBeTruthy();
    expect(Calendar.updateCalendar).toHaveBeenCalled();
  });

  test('Pay-02: createFree with rabat100 on scratch is rejected', async () => {
    Calendar.findCalendarById.mockResolvedValue(pendingCalendar({
      id: 'cal-scratch',
      sku: 'scratch-a3',
      data: { sku: 'scratch-a3', productType: 'scratch' },
    }));

    const res = await request(app)
      .post('/api/v1/calendars/createFree')
      .send({ calendarId: 'cal-scratch', email: 'buyer@example.com', promoCode: 'rabat100' });

    expect(res.status).toBe(403);
    expect(Calendar.updateCalendar).not.toHaveBeenCalled();
  });

  test('P-02: amount must use calendar DB SKU, not client metadata.sku', async () => {
    Calendar.findCalendarById.mockResolvedValue(pendingCalendar({ sku: 'scratch-a3' }));
    Payment.findPayments.mockResolvedValue([]);
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_downgrade',
      client_secret: 'sec',
      status: 'requires_payment_method',
      amount: 900,
      currency: 'pln',
    });

    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 9,
          currency: 'pln',
          customerEmail: 'buyer@example.com',
          orderId: 'order_downgrade',
          productId: 'cal-pending-001',
          shippingAddress: {
            fullName: 'Jan Kowalski',
            street: 'ul. Testowa 1',
            city: 'Warszawa',
            postalCode: '00-001',
            phone: '500600700',
          },
          metadata: { sku: 'interactive' },
        },
      });

    expect(res.status).toBe(400);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  test('P-03: non-PLN currency is rejected', async () => {
    Calendar.findCalendarById.mockResolvedValue(pendingCalendar({ sku: 'scratch-a3' }));
    Payment.findPayments.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 74,
          currency: 'eur',
          customerEmail: 'buyer@example.com',
          orderId: 'order_eur',
          productId: 'cal-pending-001',
          shippingAddress: {
            fullName: 'Jan Kowalski',
            street: 'ul. Testowa 1',
            city: 'Warszawa',
            postalCode: '00-001',
            phone: '500600700',
          },
          metadata: { sku: 'scratch-a3' },
        },
      });

    expect(res.status).toBe(400);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  test('Pay-03/04: client cannot set status=succeeded on create', async () => {
    Calendar.findCalendarById.mockResolvedValue(null);
    Calendar.createCalendar.mockImplementation(async () => ({
      ...pendingCalendar({ id: 'cal-new', status: 'pending', editToken: 'et' }),
      status: 'pending',
      editToken: 'et',
    }));

    const res = await request(app)
      .post('/api/v1/calendars')
      .send({
        calendar: {
          title: 'X',
          author: 'Y',
          email: 'a@b.c',
          sku: 'interactive',
          productType: 'interactive',
          tasks: [],
          status: 'succeeded',
        },
      });

    expect(res.body.calendar?.status).toBe('pending');
  });
});

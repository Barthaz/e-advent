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

describe('Faza 1 — price tampering (P-*)', () => {
  const app = loadApp();

  beforeEach(() => {
    jest.clearAllMocks();
    Payment.findPayments.mockResolvedValue([]);
    Payment.createPayment.mockImplementation(async (data) => ({
      _id: 'pay-1',
      ...data,
      status: 'pending',
    }));
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret',
      status: 'requires_payment_method',
      amount: 900,
      currency: 'pln',
    });
  });

  test('P-01: amount 1 PLN for scratch-a3 is rejected', async () => {
    Calendar.findCalendarById.mockResolvedValue(pendingCalendar({ sku: 'scratch-a3' }));

    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 1,
          currency: 'pln',
          customerEmail: 'buyer@example.com',
          orderId: 'order_test_1',
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
    expect(JSON.stringify(res.body)).toMatch(/Amount must be exactly/i);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  test('P-04: unknown SKU on calendar record is rejected', async () => {
    Calendar.findCalendarById.mockResolvedValue(
      pendingCalendar({ sku: 'totally-fake', data: { sku: 'totally-fake', productType: 'interactive' } })
    );

    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 9,
          currency: 'pln',
          customerEmail: 'buyer@example.com',
          orderId: 'order_test_4',
          productId: 'cal-pending-001',
          metadata: { sku: 'totally-fake' },
        },
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/Unknown product SKU/i);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  test('P-05a: missing productId is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 9,
          currency: 'pln',
          customerEmail: 'buyer@example.com',
          orderId: 'order_test_5a',
          metadata: { sku: 'interactive' },
        },
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/ProductId is required/i);
  });

  test('P-05b: non-existent calendar is rejected', async () => {
    Calendar.findCalendarById.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 9,
          currency: 'pln',
          customerEmail: 'buyer@example.com',
          orderId: 'order_test_5b',
          productId: 'missing-cal',
          metadata: { sku: 'interactive' },
        },
      });

    expect(res.status).toBe(404);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  test('P-05c: already succeeded calendar cannot create payment intent', async () => {
    Calendar.findCalendarById.mockResolvedValue(
      pendingCalendar({ status: 'succeeded', sku: 'interactive', data: { sku: 'interactive', productType: 'interactive' } })
    );

    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 9,
          currency: 'pln',
          customerEmail: 'buyer@example.com',
          orderId: 'order_test_5c',
          productId: 'cal-pending-001',
          metadata: { sku: 'interactive' },
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid calendar status/i);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  test('P-01b: correct catalog amount for scratch-a3 is accepted', async () => {
    Calendar.findCalendarById.mockResolvedValue(pendingCalendar({ sku: 'scratch-a3' }));
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_test_74',
      client_secret: 'secret',
      status: 'requires_payment_method',
      amount: 7400,
      currency: 'pln',
    });

    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 74,
          currency: 'pln',
          customerEmail: 'buyer@example.com',
          orderId: 'order_test_ok',
          productId: 'cal-pending-001',
          shippingAddress: {
            fullName: 'Jan Kowalski',
            street: 'ul. Testowa 1',
            city: 'Warszawa',
            postalCode: '00-001',
            phone: '500600700',
          },
          metadata: { sku: 'scratch-a3', productType: 'scratch' },
        },
      });

    expect(res.status).toBe(200);
    expect(stripe.paymentIntents.create).toHaveBeenCalled();
  });

  test('P-06: santa-letter cart item without address is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 34,
          currency: 'pln',
          customerEmail: 'buyer@example.com',
          orderId: 'order_letter_1',
          items: [{ sku: 'santa-letter', quantity: 1 }],
        },
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/shipping address/i);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  test('P-07: santa-letter with address and correct total is accepted', async () => {
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_letter',
      client_secret: 'secret',
      status: 'requires_payment_method',
      amount: 3400,
      currency: 'pln',
    });

    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 34,
          currency: 'pln',
          customerEmail: 'buyer@example.com',
          orderId: 'order_letter_2',
          items: [{ sku: 'santa-letter', quantity: 1 }],
          shippingAddress: {
            fullName: 'Anna Nowak',
            street: 'ul. Świąteczna 5',
            city: 'Kraków',
            postalCode: '30-001',
            phone: '501502503',
          },
        },
      });

    expect(res.status).toBe(200);
    expect(stripe.paymentIntents.create).toHaveBeenCalled();
  });

  test('P-08: free shipping cart total must match server (no shipping charged)', async () => {
    Calendar.findCalendarById.mockResolvedValue(pendingCalendar({ sku: 'scratch-a3' }));
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_free_ship',
      client_secret: 'secret',
      status: 'requires_payment_method',
      amount: 12700,
      currency: 'pln',
    });

    // 69 + 29*2 = 127, free shipping
    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 127,
          currency: 'pln',
          customerEmail: 'buyer@example.com',
          orderId: 'order_free_ship',
          items: [
            { calendarId: 'cal-pending-001', quantity: 1 },
            { sku: 'santa-letter', quantity: 2 },
          ],
          shippingAddress: {
            fullName: 'Anna Nowak',
            street: 'ul. Świąteczna 5',
            city: 'Kraków',
            postalCode: '30-001',
            phone: '501502503',
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.shipping).toBe(0);
  });

  test('P-09: santa-certificate without letter is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 9,
          currency: 'pln',
          customerEmail: 'buyer@example.com',
          orderId: 'order_cert_alone',
          items: [{
            sku: 'santa-certificate',
            quantity: 1,
            metadata: { childName: 'Kasia' },
          }],
          shippingAddress: {
            fullName: 'Anna Nowak',
            street: 'ul. Świąteczna 5',
            city: 'Kraków',
            postalCode: '30-001',
            phone: '501502503',
          },
        },
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/Listem do Świętego Mikołaja/i);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  test('P-10: letter with certificate and correct total is accepted', async () => {
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_letter_cert',
      client_secret: 'secret',
      status: 'requires_payment_method',
      amount: 4300,
      currency: 'pln',
    });

    const res = await request(app)
      .post('/api/v1/stripe/create-payment-intent')
      .send({
        data: {
          amount: 43,
          currency: 'pln',
          customerEmail: 'buyer@example.com',
          orderId: 'order_letter_cert',
          items: [
            { sku: 'santa-letter', quantity: 1 },
            { sku: 'santa-certificate', quantity: 1, metadata: { childName: 'Kasia Kowalska' } },
          ],
          shippingAddress: {
            fullName: 'Anna Nowak',
            street: 'ul. Świąteczna 5',
            city: 'Kraków',
            postalCode: '30-001',
            phone: '501502503',
          },
        },
      });

    expect(res.status).toBe(200);
    expect(stripe.paymentIntents.create).toHaveBeenCalled();
  });
});

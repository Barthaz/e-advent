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

const jwt = require('jsonwebtoken');
const { request, loadApp } = require('../helpers/createTestApp');
const Payment = require('../../models/Payment');

describe('Email admin / cron auth', () => {
  const app = loadApp();
  const secret = process.env.JWT_SECRET;
  const adminToken = jwt.sign({ id: 1, username: 'admin' }, secret, { expiresIn: '1h' });

  test('POST /send-email without auth returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/email/send-email')
      .send({
        email: 'victim@example.com',
        calendarLink: 'https://evil.example/x',
        name: 'Victim',
      });
    expect(res.status).toBe(401);
  });

  test('GET /email/test without auth returns 401', async () => {
    const res = await request(app).get('/api/v1/email/test/victim@example.com');
    expect(res.status).toBe(401);
  });

  test('compat POST /api/send-email without auth returns 401', async () => {
    const res = await request(app)
      .post('/api/send-email')
      .send({ email: 'victim@example.com', calendarLink: 'https://x' });
    expect(res.status).toBe(401);
  });

  test('admin email endpoints without JWT return 401', async () => {
    const paths = [
      ['get', '/api/v1/admin/orders/ord-1/emails'],
      ['post', '/api/v1/admin/orders/ord-1/emails/paid'],
      ['post', '/api/v1/admin/orders/ord-1/emails/shipping'],
      ['post', '/api/v1/admin/calendars/cal-1/emails/day/1'],
      ['get', '/api/v1/admin/emails/daily-today/preview'],
      ['post', '/api/v1/admin/emails/daily-today'],
    ];
    for (const [method, path] of paths) {
      const res = await request(app)[method](path).send({});
      expect(res.status).toBe(401);
    }
  });

  test('shipping email without tracking returns 400', async () => {
    Payment.findPaymentById.mockResolvedValue({
      id: 'ord-1',
      status: 'succeeded',
      customerEmail: 'a@b.c',
      productType: 'scratch',
      trackingNumber: null,
      items: [{ sku: 'scratch-a4', quantity: 1, unitPrice: 49 }],
    });

    const res = await request(app)
      .post('/api/v1/admin/orders/ord-1/emails/shipping')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('NO_TRACKING');
  });

  test('cron daily-windows without secret returns 401 or 503', async () => {
    const res = await request(app).get('/api/v1/cron/daily-windows');
    expect([401, 503]).toContain(res.status);
  });

  test('cron daily-windows with wrong bearer is 401 when secret is set', async () => {
    const prev = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'expected-secret';
    try {
      const res = await request(app)
        .get('/api/v1/cron/daily-windows')
        .set('Authorization', 'Bearer wrong');
      expect(res.status).toBe(401);
    } finally {
      if (prev === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = prev;
    }
  });

  test('admin paid email requires succeeded order', async () => {
    Payment.findPaymentById.mockResolvedValue({
      id: 'ord-pending',
      status: 'pending',
      customerEmail: 'a@b.c',
      items: [],
    });
    const res = await request(app)
      .post('/api/v1/admin/orders/ord-pending/emails/paid')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('NOT_PAID');
  });
});

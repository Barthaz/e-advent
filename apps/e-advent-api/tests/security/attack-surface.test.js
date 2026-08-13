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
  getMysqlConfig: jest.fn(() => ({
    host: 'localhost',
    port: 3306,
    database: 'test-db',
    user: 'test',
    password: '',
  })),
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

const { testingMode } = require('../../config/app');
const { request, loadApp } = require('../helpers/createTestApp');

describe('Faza 4 — attack surface (X-*)', () => {
  const app = loadApp();

  test('X-05: health endpoint does not leak secrets', async () => {
    const res = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(res.status);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toMatch(/sk_live|password|MYSQL_PASSWORD|JWT_SECRET/i);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('services');
  });

  test('X-04: testingMode defaults to false (CORS locked down unless TESTING_MODE=true)', () => {
    expect(testingMode).toBe(false);
  });

  test('X-03: promocode enumeration returns valid:false without listing codes', async () => {
    const res = await request(app).get('/api/v1/promocodes/AAAAAA');
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body).not.toHaveProperty('codes');
    expect(JSON.stringify(res.body)).not.toMatch(/rabat100/i);
  });
});

describe('Faza 4 — email/upload auth (fixed)', () => {
  const app = loadApp();

  test('X-01: POST /email/send without auth returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/email/send')
      .send({
        to: 'victim@example.com',
        subject: 'spam',
        text: 'hello',
      });

    expect(res.status).toBe(401);
  });

  test('X-02: POST /uploads/design without editToken returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/uploads/design')
      .attach('image', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: 'x.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(401);
  });
});

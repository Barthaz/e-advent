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
jest.mock('../../models/AdminUser', () => {
  const actual = jest.requireActual('../../models/AdminUser');
  return {
    ...actual,
    findByUsername: jest.fn(),
    verifyPassword: jest.fn(),
  };
});

const jwt = require('jsonwebtoken');
const { request, loadApp } = require('../helpers/createTestApp');
const AdminUser = require('../../models/AdminUser');

describe('Faza 2 — admin auth (A-*)', () => {
  const app = loadApp();
  const secret = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('A-01: GET /admin/orders without token returns 401', async () => {
    const res = await request(app).get('/api/v1/admin/orders');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Unauthorized/i);
  });

  test('A-04: empty / null Authorization is rejected', async () => {
    const r1 = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', '');
    expect(r1.status).toBe(401);

    const r2 = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', 'Bearer null');
    expect(r2.status).toBe(401);
  });

  test('A-02: tampered JWT is rejected', async () => {
    const token = jwt.sign({ id: 1, username: 'admin' }, 'wrong-secret', { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('A-02b: expired JWT is rejected', async () => {
    const token = jwt.sign({ id: 1, username: 'admin' }, secret, { expiresIn: '-1s' });
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('A-01b: valid JWT passes auth gate (not 401)', async () => {
    const token = jwt.sign({ id: 1, username: 'admin' }, secret, { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).not.toBe(401);
  });

  test('A-06: login with wrong password returns 401', async () => {
    AdminUser.findByUsername.mockResolvedValue({
      id: 1,
      username: 'admin',
      password_hash: 'hash',
    });
    AdminUser.verifyPassword.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/v1/admin/login')
      .send({ username: 'admin', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid credentials/i);
  });

  test('A-07: JWT_SECRET in test env is not the insecure default', () => {
    expect(process.env.JWT_SECRET).toBeTruthy();
    expect(process.env.JWT_SECRET).not.toBe('change-me-in-production');
  });
});

describe('Faza 2 — rate limit', () => {
  test('A-05: loginLimiter rejects after threshold when FORCE_RATE_LIMIT=true', async () => {
    jest.resetModules();
    process.env.FORCE_RATE_LIMIT = 'true';

    jest.doMock('../../config/database', () => ({
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
    jest.doMock('../../models/Calendar', () => require('../mocks/Calendar'));
    jest.doMock('../../models/Payment', () => require('../mocks/Payment'));
    jest.doMock('../../config/email', () => ({
      sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    }));
    jest.doMock('../../config/stripe', () => ({
      paymentIntents: { create: jest.fn(), update: jest.fn(), retrieve: jest.fn() },
      webhooks: { constructEvent: jest.fn() },
      customers: { list: jest.fn().mockResolvedValue({ data: [] }) },
    }));
    jest.doMock('../../models/AdminUser', () => {
      const actual = jest.requireActual('../../models/AdminUser');
      return {
        ...actual,
        findByUsername: jest.fn().mockResolvedValue(null),
        verifyPassword: jest.fn(),
      };
    });

    const request = require('supertest');
    const app = require('../../app');

    const statuses = [];
    for (let i = 0; i < 8; i += 1) {
      const res = await request(app)
        .post('/api/v1/admin/login')
        .send({ username: 'admin', password: `attempt-${i}` });
      statuses.push(res.status);
    }

    expect(statuses.some((s) => s === 429)).toBe(true);
    delete process.env.FORCE_RATE_LIMIT;
  });
});

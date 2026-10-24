jest.mock('../../config/database', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  getPool: jest.fn(() => ({
    getConnection: jest.fn().mockResolvedValue({ ping: jest.fn().mockResolvedValue(undefined), release: jest.fn() }),
  })),
  query: jest.fn().mockResolvedValue([[], []]),
  withTransaction: jest.fn(fn => fn()),
  withNamedLocks: jest.fn((keys, fn) => fn()),
  closeConnection: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../models/Calendar', () => require('../mocks/Calendar'));
jest.mock('../../models/Payment', () => require('../mocks/Payment'));
jest.mock('../../config/email', () => ({ sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }) }));
jest.mock('../../config/stripe', () => ({
  paymentIntents: { create: jest.fn(), update: jest.fn(), retrieve: jest.fn() },
  webhooks: { constructEvent: jest.fn() },
  customers: { list: jest.fn().mockResolvedValue({ data: [] }) },
}));

const jwt = require('jsonwebtoken');
const { request, loadApp } = require('../helpers/createTestApp');
const db = require('../../config/database');
const { installDiscountStore, discountRow } = require('../helpers/discountFixture');

describe('admin and public discount codes', () => {
  const app = loadApp();
  const token = jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue([[], []]);
    installDiscountStore(db.query, [discountRow({ code: 'SAVE10', percent: 10, reusable: 1 })]);
  });

  test('public lookup accepts a stored 10% code and hides the catalog', async () => {
    const ok = await request(app).get('/api/v1/promocodes/save10');
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ valid: true, discount: 10 });
    expect(ok.body).not.toHaveProperty('codes');
  });

  test('admin discount routes require a JWT', async () => {
    const list = await request(app).get('/api/v1/admin/discount-codes');
    const create = await request(app).post('/api/v1/admin/discount-codes').send({ percent: 10, reusable: false });
    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
  });

  test('admin can generate and list codes', async () => {
    const created = await request(app)
      .post('/api/v1/admin/discount-codes')
      .set('Authorization', `Bearer ${token}`)
      .send({ percent: 20, reusable: true, count: 1 });
    expect(created.status).toBe(201);
    expect(created.body.codes).toHaveLength(1);
    expect(created.body.codes[0]).toMatchObject({ percent: 20, reusable: true, active: true });

    const list = await request(app)
      .get('/api/v1/admin/discount-codes')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.codes.length).toBeGreaterThanOrEqual(2);
  });

  test('admin can disable a code', async () => {
    const row = discountRow({ id: '11111111-1111-4111-8111-111111111111', code: 'OFF10', percent: 10 });
    installDiscountStore(db.query, [row]);
    const res = await request(app)
      .patch(`/api/v1/admin/discount-codes/${row.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ active: false });
    expect(res.status).toBe(200);
    expect(res.body.code).toMatchObject({ code: 'OFF10', active: false });
  });
});

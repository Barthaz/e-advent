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

const ORDER_ID = '22222222-2222-4222-8222-222222222222';
const ITEM_ID = '11111111-1111-4111-8111-111111111111';

describe('admin letter pack item routes', () => {
  const app = loadApp();
  const token = jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  test('deleting a certificate requires an admin JWT', async () => {
    const res = await request(app).delete(`/api/v1/admin/orders/${ORDER_ID}/items/${ITEM_ID}`);
    expect(res.status).toBe(401);
  });

  test('removing a letter requires an admin JWT', async () => {
    const res = await request(app).post(`/api/v1/admin/orders/${ORDER_ID}/letter-pack/remove-letter`);
    expect(res.status).toBe(401);
  });

  test('authenticated admin gets a 404 for a missing order', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/orders/${ORDER_ID}/letter-pack/remove-letter`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

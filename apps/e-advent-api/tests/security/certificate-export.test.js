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
jest.mock('../../services/certificate/certificatePdf', () => {
  const actual = jest.requireActual('../../services/certificate/certificatePdf');
  return {
    ...actual,
    buildCertificatePdf: jest.fn(async ({ variant, childName, serialNumber }) => (
      Buffer.from(`%PDF-1.4 mock ${variant} ${childName} ${serialNumber}`)
    )),
  };
});

const jwt = require('jsonwebtoken');
const { request, loadApp } = require('../helpers/createTestApp');
const db = require('../../config/database');
const { buildCertificatePdf } = require('../../services/certificate/certificatePdf');

const ORDER_ID = '22222222-2222-4222-8222-222222222222';
const ITEM_ID = '11111111-1111-4111-8111-111111111111';

describe('admin certificate PDF export', () => {
  const app = loadApp();
  const token = jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const itemRow = {
    id: ITEM_ID,
    order_id: ORDER_ID,
    sku: 'santa-certificate',
    metadata: { childName: 'Kasia' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    db.withNamedLocks.mockImplementation((keys, fn) => fn());
    db.query.mockImplementation(async (sql) => {
      if (String(sql).includes('AND order_id')) return [[itemRow]];
      if (String(sql).includes('FROM order_items WHERE id')) return [[itemRow]];
      if (String(sql).includes('JSON_EXTRACT')) return [[{ max_n: 0 }]];
      return [[], []];
    });
  });

  test('requires an admin JWT', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/orders/${ORDER_ID}/items/${ITEM_ID}/certificate.pdf`)
      .query({ variant: 'ona' });
    expect(res.status).toBe(401);
  });

  test('rejects a missing variant', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/orders/${ORDER_ID}/items/${ITEM_ID}/certificate.pdf`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  test('rejects a non-certificate SKU', async () => {
    db.query.mockResolvedValue([[{ ...itemRow, sku: 'santa-letter' }]]);
    const res = await request(app)
      .get(`/api/v1/admin/orders/${ORDER_ID}/items/${ITEM_ID}/certificate.pdf`)
      .query({ variant: 'on' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('NOT_CERTIFICATE');
  });

  test('returns 404 when the item is missing', async () => {
    db.query.mockResolvedValue([[]]);
    const res = await request(app)
      .get(`/api/v1/admin/orders/${ORDER_ID}/items/${ITEM_ID}/certificate.pdf`)
      .query({ variant: 'ona' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('downloads a PDF for the chosen variant', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/orders/${ORDER_ID}/items/${ITEM_ID}/certificate.pdf`)
      .query({ variant: 'ona' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
    expect(res.headers['content-disposition']).toMatch(/certyfikat-SN-2026-000001-ona\.pdf/);
    expect(buildCertificatePdf).toHaveBeenCalledWith({
      variant: 'ona',
      childName: 'Kasia',
      serialNumber: 1,
    });
    expect(Buffer.isBuffer(res.body) ? res.body.toString() : String(res.body)).toContain('ona');
  });
});

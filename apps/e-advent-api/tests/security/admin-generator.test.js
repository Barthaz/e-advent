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
    buildCertificatePdf: jest.fn(async ({ variant, childName, serialNumber, serialPrefix }) => (
      Buffer.from(`%PDF-1.4 mock ${serialPrefix || 'SN'} ${variant} ${childName} ${serialNumber}`)
    )),
  };
});

const jwt = require('jsonwebtoken');
const { request, loadApp } = require('../helpers/createTestApp');
const db = require('../../config/database');
const Calendar = require('../../models/Calendar');
const { sendEmail } = require('../../config/email');
const { buildCertificatePdf } = require('../../services/certificate/certificatePdf');

const CERT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SCRATCH_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const INTERACTIVE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function certRow(overrides = {}) {
  return {
    id: CERT_ID,
    title: 'Kasia',
    author: 'ona',
    email: '',
    product_type: 'certificate',
    sku: 'santa-certificate',
    format: null,
    design_url: null,
    tasks: [{ childName: 'Kasia', variant: 'ona', certificateNumber: 1 }],
    status: 'pending',
    access_code: null,
    is_free: 0,
    fulfillment_status: 'pending',
    fulfillment_notes: null,
    opening_method: null,
    daily_content_email: null,
    origin: 'generator',
    created_at: '2026-10-27T10:00:00.000Z',
    updated_at: '2026-10-27T10:00:00.000Z',
    ...overrides,
  };
}

describe('admin generator', () => {
  const app = loadApp();
  const token = jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  beforeEach(() => {
    jest.clearAllMocks();
    db.withNamedLocks.mockImplementation((keys, fn) => fn());
    Calendar.createCalendar.mockImplementation(async ({ data }) => ({
      id: data.productType === 'scratch' ? SCRATCH_ID : data.productType === 'interactive' ? INTERACTIVE_ID : CERT_ID,
      data,
      status: 'pending',
    }));
    Calendar.setCalendarOrigin.mockResolvedValue({});
    Calendar.updateCalendar.mockResolvedValue({});
    Calendar.findGeneratedCalendars.mockResolvedValue([certRow()]);
    Calendar.countGeneratedCalendars.mockResolvedValue(1);
    db.query.mockImplementation(async (sql) => {
      const text = String(sql);
      if (/INSERT INTO orders|INTO order_items|UPDATE order_items/i.test(text)) {
        throw new Error('orders/order_items must not be touched by generator');
      }
      if (text.includes('MAX') && text.includes('origin')) return [[{ max_n: 0 }]];
      if (text.includes('FROM calendars WHERE id')) {
        if (String(sql).includes(INTERACTIVE_ID) || text.includes('?')) {
          return [[certRow()]];
        }
        return [[certRow()]];
      }
      return [[], []];
    });
  });

  test('requires an admin JWT', async () => {
    const res = await request(app).get('/api/v1/admin/generator');
    expect(res.status).toBe(401);
  });

  test('lists generator calendars without touching orders', async () => {
    const res = await request(app)
      .get('/api/v1/admin/generator')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].origin).toBe('generator');
    expect(Calendar.findGeneratedCalendars).toHaveBeenCalled();
  });

  test('creates a certificate without orders and without shop serials', async () => {
    const res = await request(app)
      .post('/api/v1/admin/generator/certificates')
      .set('Authorization', `Bearer ${token}`)
      .send({ childName: 'Kasia', variant: 'ona' });
    expect(res.status).toBe(201);
    expect(Calendar.createCalendar).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        productType: 'certificate',
        sku: 'santa-certificate',
        title: 'Kasia',
      }),
    }));
    expect(Calendar.setCalendarOrigin).toHaveBeenCalledWith(CERT_ID, 'generator');
    expect(sendEmail).not.toHaveBeenCalled();
    const sql = db.query.mock.calls.map((call) => String(call[0])).join('\n');
    expect(sql).not.toMatch(/order_items/);
    expect(sql).not.toMatch(/INSERT INTO orders/);
  });

  test('downloads generator PDF with GEN serial prefix', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/generator/certificates/${CERT_ID}/pdf`)
      .query({ variant: 'ona' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/certyfikat-GEN-2026-000001-ona\.pdf/);
    expect(buildCertificatePdf).toHaveBeenCalledWith({
      variant: 'ona',
      childName: 'Kasia',
      serialNumber: 1,
      serialPrefix: 'GEN',
    });
  });

  test('creates a scratch calendar from a preset', async () => {
    db.query.mockImplementation(async (sql) => {
      const text = String(sql);
      if (/INSERT INTO orders|INTO order_items/i.test(text)) {
        throw new Error('orders/order_items must not be touched by generator');
      }
      if (text.includes('FROM calendars WHERE id')) {
        return [[{
          ...certRow({
            id: SCRATCH_ID,
            product_type: 'scratch',
            sku: 'scratch-a3',
            title: 'Kalendarz zdrapka',
            design_url: '/designs/scratch/red.png',
          }),
        }]];
      }
      return [[], []];
    });
    const res = await request(app)
      .post('/api/v1/admin/generator/scratch')
      .set('Authorization', `Bearer ${token}`)
      .send({ color: 'red', presetId: 0 });
    expect(res.status).toBe(201);
    expect(Calendar.createCalendar).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        productType: 'scratch',
        sku: 'scratch-a3',
        format: 'A3',
      }),
    }));
    expect(Calendar.setCalendarOrigin).toHaveBeenCalledWith(SCRATCH_ID, 'generator');
  });

  test('unlocks interactive calendars without sending access email', async () => {
    db.query.mockImplementation(async (sql) => {
      const text = String(sql);
      if (/INSERT INTO orders|INTO order_items/i.test(text)) {
        throw new Error('orders/order_items must not be touched by generator');
      }
      if (text.includes('FROM calendars WHERE id')) {
        return [[{
          id: INTERACTIVE_ID,
          title: 'Kalendarz interaktywny',
          author: 'Generator',
          email: 'owner@example.com',
          product_type: 'interactive',
          sku: 'interactive',
          tasks: [{ day: 1, title: 'Pierniki', status: 'closed' }],
          status: 'succeeded',
          access_code: 'ABC123',
          is_free: 1,
          fulfillment_status: 'delivered',
          opening_method: 'email',
          daily_content_email: 'owner@example.com',
          origin: 'generator',
          created_at: '2026-10-27T10:00:00.000Z',
          updated_at: '2026-10-27T10:00:00.000Z',
        }]];
      }
      return [[], []];
    });

    const res = await request(app)
      .post('/api/v1/admin/generator/interactive')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'owner@example.com',
        openingMethod: 'email',
        tasks: [{ day: 1, title: 'Pierniki' }],
      });
    expect(res.status).toBe(201);
    expect(Calendar.updateCalendar).toHaveBeenCalledWith(
      INTERACTIVE_ID,
      expect.objectContaining({
        status: 'succeeded',
        isFree: true,
        fulfillmentStatus: 'delivered',
        accessCode: expect.any(String),
      }),
    );
    expect(sendEmail).not.toHaveBeenCalled();
    expect(res.body.accessCode).toBeTruthy();
  });
});

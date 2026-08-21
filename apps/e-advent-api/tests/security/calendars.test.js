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
const { sendEmail } = require('../../config/email');

describe('Faza 3 — calendars ID / access / multi-create (C-*, M-*)', () => {
  const app = loadApp();

  beforeEach(() => {
    jest.clearAllMocks();
    sendEmail.mockResolvedValue({ messageId: 'm1' });
  });

  test('C-01 characterization: GET /calendars/:id is public (no auth)', async () => {
    Calendar.findCalendarById.mockResolvedValue(
      pendingCalendar({
        id: 'victim-cal',
        status: 'succeeded',
        accessCode: 'SECRET',
        data: {
          email: 'victim@example.com',
          sku: 'interactive',
          productType: 'interactive',
          title: 'Private',
          author: 'V',
          tasks: [],
        },
      })
    );

    const res = await request(app).get('/api/v1/calendars/victim-cal');
    expect(res.status).toBe(200);
    expect(res.body.calendar.email).toBe('victim@example.com');
  });

  test('C-06: wrong access code returns 404 without calendar payload', async () => {
    Calendar.findCalendarByEmailAndAccessCode.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/calendars/access')
      .send({ email: 'buyer@example.com', accessCode: 'WRONG1' });

    expect(res.status).toBe(404);
    expect(res.body.calendar).toBeUndefined();
  });

  test('C-05: collision on createCalendar still surfaces as error (no silent overwrite)', async () => {
    Calendar.findCalendarById.mockResolvedValue(null);
    Calendar.createCalendar.mockRejectedValue(new Error('Calendar with ID cal-dup already exists'));

    const res = await request(app)
      .post('/api/v1/calendars')
      .send({
        calendar: {
          title: 'Second',
          author: 'X',
          email: 'a@b.c',
          sku: 'interactive',
          productType: 'interactive',
          tasks: [],
        },
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('M-03: two creates without id get two distinct server UUIDs', async () => {
    Calendar.findCalendarById.mockResolvedValue(null);
    Calendar.createCalendar
      .mockResolvedValueOnce(pendingCalendar({
        id: 'uuid-aaaa-1111',
        data: { sku: 'interactive', productType: 'interactive' },
      }))
      .mockResolvedValueOnce(pendingCalendar({
        id: 'uuid-bbbb-2222',
        data: { sku: 'interactive', productType: 'interactive' },
      }));

    const payload = {
      calendar: {
        title: 'Cal',
        author: 'A',
        email: 'a@b.c',
        sku: 'interactive',
        productType: 'interactive',
        tasks: [],
      },
    };

    const r1 = await request(app).post('/api/v1/calendars').send(payload);
    const r2 = await request(app).post('/api/v1/calendars').send(payload);

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r1.body.calendar.id).not.toBe(r2.body.calendar.id);
  });

  test('C-succeeded-lock: update of succeeded calendar is rejected', async () => {
    Calendar.findCalendarById.mockResolvedValue(
      pendingCalendar({
        id: 'paid-cal',
        status: 'succeeded',
        data: { sku: 'interactive', productType: 'interactive' },
      })
    );

    const res = await request(app)
      .put('/api/v1/calendars/paid-cal')
      .send({
        calendar: {
          title: 'Hacked',
          author: 'Evil',
          email: 'evil@example.com',
          tasks: [],
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid calendar status/i);
    expect(Calendar.updateCalendarData).not.toHaveBeenCalled();
  });
});

describe('Faza 3 — calendar ownership / ID (fixed)', () => {
  const app = loadApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('C-04: client-supplied id is ignored; createCalendar called without client id', async () => {
    Calendar.findCalendarById.mockResolvedValue(null);
    Calendar.createCalendar.mockImplementation(async (payload) =>
      pendingCalendar({
        id: 'server-generated-uuid',
        editToken: 'et-1',
        data: payload.data,
        status: 'pending',
      })
    );

    await request(app)
      .post('/api/v1/calendars')
      .send({
        calendar: {
          id: 'client-forced-id-123',
          title: 'X',
          author: 'Y',
          email: 'a@b.c',
          sku: 'interactive',
          productType: 'interactive',
          tasks: [],
        },
      });

    const arg = Calendar.createCalendar.mock.calls[0][0];
    expect(arg.id).toBeUndefined();
  });

  test('C-02: PUT on pending without editToken is rejected', async () => {
    Calendar.findCalendarById.mockResolvedValue(
      pendingCalendar({ id: 'foreign-pending', editToken: 'secret-token' })
    );

    const res = await request(app)
      .put('/api/v1/calendars/foreign-pending')
      .send({
        calendar: {
          title: 'Overwritten',
          author: 'Attacker',
          email: 'attacker@example.com',
          tasks: [],
        },
      });

    expect(res.status).toBe(403);
    expect(Calendar.updateCalendarData).not.toHaveBeenCalled();
  });

  test('C-03: open-day with calendar id succeeds without access code', async () => {
    const cal = pendingCalendar({
      id: 'any-cal',
      status: 'succeeded',
      accessCode: 'SECRET',
      editToken: 'et',
      data: {
        sku: 'interactive',
        productType: 'interactive',
        tasks: [{ day: 1, title: 'T', status: 'closed' }],
      },
    });
    Calendar.findCalendarById.mockResolvedValue(cal);
    Calendar.openTask.mockResolvedValue({
      ...cal,
      data: { ...cal.data, tasks: [{ day: 1, title: 'T', status: 'opened' }] },
    });

    const res = await request(app).put('/api/v1/calendars/any-cal/open/1');
    expect(res.status).toBe(200);
    expect(Calendar.openTask).toHaveBeenCalled();
  });
});

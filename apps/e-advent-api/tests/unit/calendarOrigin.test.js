jest.mock('../../config/database', () => ({
  query: jest.fn().mockResolvedValue([[]]),
  withNamedLocks: jest.fn((keys, fn) => fn()),
}));

const db = require('../../config/database');
const Calendar = require('../../models/Calendar');

describe('calendar origin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue([[]]);
  });

  test('daily email query includes generator calendars (no origin filter)', async () => {
    await Calendar.findEmailOpeningCalendars();
    expect(db.query.mock.calls[0][0]).toMatch(/opening_method = 'email'/);
    expect(db.query.mock.calls[0][0]).toMatch(/status = 'succeeded'/);
    expect(db.query.mock.calls[0][0]).not.toMatch(/origin/);
  });

  test('generator list queries only origin=generator', async () => {
    await Calendar.findGeneratedCalendars({ type: 'certificate', limit: 20, skip: 0 });
    expect(db.query.mock.calls[0][0]).toMatch(/origin = 'generator'/);
    expect(db.query.mock.calls[0][0]).toMatch(/product_type = \?/);
    expect(db.query.mock.calls[0][1]).toEqual(['certificate', 20]);
  });

  test('createCalendar insert does not set origin (DB default store)', async () => {
    db.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{
        id: 'cal-1',
        title: 'T',
        author: 'A',
        email: 'a@b.c',
        product_type: 'interactive',
        sku: 'interactive',
        tasks: '[]',
        status: 'pending',
        origin: 'store',
      }]]);
    await Calendar.createCalendar({ data: { title: 'T', email: 'a@b.c' } });
    expect(db.query.mock.calls[0][0]).toMatch(/INSERT INTO calendars/);
    expect(db.query.mock.calls[0][0]).not.toMatch(/origin/);
  });
});

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

  test('deleteGeneratedCalendar removes only a generator row and its side data', async () => {
    db.query
      .mockResolvedValueOnce([[{ id: 'cal-1', origin: 'generator', title: 'Zdrapka', product_type: 'scratch' }]])
      .mockResolvedValueOnce([[{ linked: 0 }]])
      .mockResolvedValue([[{ affectedRows: 1 }]]);

    const removed = await Calendar.deleteGeneratedCalendar('cal-1');
    expect(removed).toEqual({ id: 'cal-1', title: 'Zdrapka', productType: 'scratch' });
    const sql = db.query.mock.calls.map((call) => String(call[0]));
    expect(sql.some((statement) => statement.includes('DELETE FROM special_window_progress'))).toBe(true);
    expect(sql.some((statement) => statement.includes('DELETE FROM date_gate_entries'))).toBe(true);
    expect(sql.some((statement) => statement.includes('DELETE FROM email_sends'))).toBe(true);
    expect(sql.some((statement) => statement.includes("DELETE FROM calendars WHERE id = ? AND origin = ?"))).toBe(true);
    expect(db.query.mock.calls.at(-1)[1]).toEqual(['cal-1', 'generator']);
  });

  test('deleteGeneratedCalendar refuses shop calendars and order-linked rows', async () => {
    db.query.mockResolvedValueOnce([[{ id: 'shop-1', origin: 'store', title: 'Sklep', product_type: 'interactive' }]]);
    await expect(Calendar.deleteGeneratedCalendar('shop-1')).rejects.toMatchObject({ code: 'NOT_GENERATOR' });
    expect(db.query.mock.calls.map((call) => String(call[0])).join('\n')).not.toMatch(/DELETE FROM calendars/);

    db.query.mockReset();
    db.query
      .mockResolvedValueOnce([[{ id: 'gen-1', origin: 'generator', title: 'Gen', product_type: 'interactive' }]])
      .mockResolvedValueOnce([[{ linked: 2 }]]);
    await expect(Calendar.deleteGeneratedCalendar('gen-1')).rejects.toMatchObject({ status: 409, code: 'LINKED_TO_ORDER' });
    expect(db.query.mock.calls.map((call) => String(call[0])).join('\n')).not.toMatch(/DELETE FROM calendars/);
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

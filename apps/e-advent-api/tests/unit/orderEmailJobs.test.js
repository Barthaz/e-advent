jest.mock('../../config/database', () => ({ query: jest.fn(), withNamedLocks: jest.fn() }));
jest.mock('../../models/Payment', () => ({ findPaymentById: jest.fn() }));
jest.mock('../../services/orderMailer', () => ({ sendPaidOrderEmails: jest.fn() }));
const db = require('../../config/database');
const Payment = require('../../models/Payment');
const { sendPaidOrderEmails } = require('../../services/orderMailer');
const { deliverOrderEmails, retryOrderEmails } = require('../../services/orderEmailJobs');
let status;
beforeEach(() => {
  jest.clearAllMocks();
  status = 'pending';
  let tail = Promise.resolve();
  db.withNamedLocks.mockImplementation((keys, fn) => {
    const result = tail.then(fn);
    tail = result.catch(() => {});
    return result;
  });
  db.query.mockImplementation(async sql => {
    if (sql.startsWith('SELECT status')) return [[{ status }]];
    if (sql.startsWith('SELECT order_id')) return [[{ order_id: 'order' }]];
    if (sql.includes("SET status = 'sent'")) status = 'sent';
    return [[], []];
  });
  Payment.findPaymentById.mockResolvedValue({ id: 'order', status: 'succeeded' });
  sendPaidOrderEmails.mockResolvedValue({ sent: 1, failed: 0 });
});
test('parallel webhook deliveries send once and use the canonical UUID', async () => {
  await Promise.all([deliverOrderEmails('order'), deliverOrderEmails('order')]);
  expect(sendPaidOrderEmails).toHaveBeenCalledTimes(1);
  expect(Payment.findPaymentById).toHaveBeenCalledWith('order');
  expect(status).toBe('sent');
});
test('SMTP failure retains a retryable job; cron later completes it', async () => {
  sendPaidOrderEmails.mockResolvedValueOnce({ sent: 0, failed: 1 });
  await expect(deliverOrderEmails('order')).rejects.toThrow('delivery failed');
  expect(status).toBe('pending');
  expect(db.query.mock.calls.some(([sql]) => sql.includes('next_attempt_at = DATE_ADD'))).toBe(true);
  await expect(retryOrderEmails()).resolves.toEqual({ delivered: 1, failed: 0 });
  expect(status).toBe('sent');
});
test('one failed order does not abort other queued deliveries', async () => {
  const base = db.query.getMockImplementation();
  db.query.mockImplementation((sql, args) => sql.startsWith('SELECT order_id') ? [[{ order_id: 'one' }, { order_id: 'two' }]] : base(sql, args));
  sendPaidOrderEmails.mockRejectedValueOnce(new Error('mailbox unavailable'));
  await expect(retryOrderEmails()).resolves.toEqual({ delivered: 1, failed: 1 });
});

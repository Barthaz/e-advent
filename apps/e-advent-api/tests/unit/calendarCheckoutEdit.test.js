jest.mock('../../config/database', () => ({ query: jest.fn(), withNamedLocks: jest.fn((keys, fn) => fn()) }));
jest.mock('../../services/checkoutPayment', () => ({ cancelCalendarCheckout: jest.fn() }));
const { query } = require('../../config/database');
const { cancelCalendarCheckout } = require('../../services/checkoutPayment');
const { updateCalendarData } = require('../../models/Calendar');
let calendar;
beforeEach(() => {
  jest.clearAllMocks();
  calendar = { id: 'cal', title: 'Title', email: 'owner@example.com', status: 'pending', opening_method: null, daily_content_email: null };
  query.mockImplementation(async () => [[calendar]]);
  cancelCalendarCheckout.mockResolvedValue(undefined);
});
test('rechecks paid status after acquiring the lock, ignoring stale caller status', async () => {
  calendar.status = 'succeeded';
  await expect(updateCalendarData('cal', { email: 'wrong@example.com' }, 'pending')).rejects.toMatchObject({ status: 409 });
  expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
});
test('changing recipient cancels exposed payments before updating the calendar', async () => {
  await updateCalendarData('cal', { email: 'new@example.com' }, 'pending');
  expect(cancelCalendarCheckout).toHaveBeenCalledWith('cal');
  const updateIndex = query.mock.calls.findIndex(([sql]) => sql.startsWith('UPDATE'));
  expect(cancelCalendarCheckout.mock.invocationCallOrder[0]).toBeLessThan(query.mock.invocationCallOrder[updateIndex]);
});
test('a payment in progress prevents changing the delivery recipient', async () => {
  cancelCalendarCheckout.mockRejectedValue(new Error('Payment processing'));
  await expect(updateCalendarData('cal', { email: 'new@example.com' })).rejects.toThrow('processing');
  expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
});
test('refreshing unchanged calendar data does not cancel the existing checkout', async () => {
  await updateCalendarData('cal', { email: 'owner@example.com' });
  expect(cancelCalendarCheckout).not.toHaveBeenCalled();
});

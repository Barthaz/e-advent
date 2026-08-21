jest.mock('../../config/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'm-1' }),
}));
jest.mock('../../models/Calendar');
jest.mock('../../models/Payment');
jest.mock('../../models/EmailSend');

const { sendEmail } = require('../../config/email');
const Calendar = require('../../models/Calendar');
const Payment = require('../../models/Payment');
const EmailSend = require('../../models/EmailSend');
const {
  sendPaidOrderEmails,
  sendShippingEmailForOrder,
  sendDailyWindowEmail,
  sendTodaysDailyWindows,
} = require('../../services/orderMailer');

function interactiveCalendar(overrides = {}) {
  return {
    id: 'cal-1',
    _id: 'cal-1',
    status: 'succeeded',
    accessCode: 'ABC123',
    fulfillmentStatus: 'delivered',
    data: {
      title: 'Kalendarz',
      email: 'buyer@example.com',
      openingMethod: 'email',
      dailyContentEmail: 'daily@example.com',
      productType: 'interactive',
      sku: 'interactive',
      tasks: [
        { day: 1, task: 'Zrób pierniki', status: 'closed' },
        { day: 2, title: 'Kolęda', status: 'closed' },
      ],
    },
    ...overrides,
  };
}

function physicalOrder(overrides = {}) {
  return {
    id: 'ord-1',
    orderId: 'ord-1',
    status: 'succeeded',
    customerEmail: 'buyer@example.com',
    amount: 54,
    shippingAmount: 5,
    productType: 'scratch',
    deliveryType: 'poczta_polska',
    trackingNumber: 'PX111',
    shippingAddress: {
      fullName: 'Jan',
      street: 'ul. 1',
      city: 'Warszawa',
      postalCode: '00-001',
      phone: '500',
    },
    items: [{ sku: 'scratch-a4', quantity: 1, unitPrice: 49, calendarId: 'cal-scratch' }],
    ...overrides,
  };
}

describe('orderMailer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    EmailSend.createSend.mockResolvedValue({ id: 'es-1' });
    EmailSend.hasSuccessfulDaily.mockResolvedValue(false);
    EmailSend.countSuccessfulDaily.mockResolvedValue(0);
    Calendar.openTask.mockResolvedValue({});
    Calendar.updateCalendar.mockImplementation(async (id, data) => ({
      ...interactiveCalendar(),
      ...data,
      id,
    }));
  });

  test('sendPaidOrderEmails sends confirmation for physical order', async () => {
    const result = await sendPaidOrderEmails(physicalOrder(), 'webhook');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toBe('buyer@example.com');
    expect(sendEmail.mock.calls[0][0].subject).toMatch(/Potwierdzenie/);
    expect(result.sent).toBe(1);
    expect(EmailSend.createSend).toHaveBeenCalledWith(expect.objectContaining({
      type: 'order_confirmation',
      triggeredBy: 'webhook',
    }));
  });

  test('sendPaidOrderEmails sends access mail for interactive item', async () => {
    Calendar.findCalendarById.mockResolvedValue(interactiveCalendar({
      data: { ...interactiveCalendar().data, openingMethod: 'online' },
    }));
    const result = await sendPaidOrderEmails({
      id: 'ord-i',
      status: 'succeeded',
      customerEmail: 'buyer@example.com',
      amount: 9,
      shippingAmount: 0,
      productType: 'interactive',
      items: [{ sku: 'interactive', quantity: 1, unitPrice: 9, calendarId: 'cal-1' }],
    }, 'admin');
    expect(result.sent).toBe(1);
    expect(sendEmail.mock.calls[0][0].subject).toMatch(/Kalendarz/);
    expect(sendEmail.mock.calls[0][0].html).toContain('ABC123');
  });

  test('sendPaidOrderEmails rejects unpaid orders', async () => {
    await expect(sendPaidOrderEmails({ id: 'x', status: 'pending', customerEmail: 'a@b.c', items: [] }))
      .rejects.toMatchObject({ code: 'NOT_PAID', status: 400 });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test('sendShippingEmailForOrder requires tracking number', async () => {
    await expect(sendShippingEmailForOrder(physicalOrder({ trackingNumber: '' })))
      .rejects.toMatchObject({ code: 'NO_TRACKING', status: 400 });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test('sendShippingEmailForOrder sends tracking mail', async () => {
    const result = await sendShippingEmailForOrder(physicalOrder(), 'admin');
    expect(result.sent).toBe(1);
    expect(sendEmail.mock.calls[0][0].html).toContain('PX111');
    expect(EmailSend.createSend).toHaveBeenCalledWith(expect.objectContaining({ type: 'shipping' }));
  });

  test('sendDailyWindowEmail skips non-email opening method', async () => {
    await expect(sendDailyWindowEmail(interactiveCalendar({
      data: { ...interactiveCalendar().data, openingMethod: 'app' },
    }), 1)).rejects.toMatchObject({ code: 'NOT_EMAIL_METHOD' });
  });

  test('sendDailyWindowEmail sends and opens the task', async () => {
    const result = await sendDailyWindowEmail(interactiveCalendar(), 1, { force: true, triggeredBy: 'admin' });
    expect(result.success).toBe(true);
    expect(sendEmail.mock.calls[0][0].to).toBe('daily@example.com');
    expect(sendEmail.mock.calls[0][0].html).toContain('pierniki');
    expect(sendEmail.mock.calls[0][0].html).toContain('okienko=1');
    expect(Calendar.openTask).toHaveBeenCalledWith('cal-1', 1);
  });

  test('sendDailyWindowEmail special window uses addon CTA and day query', async () => {
    const result = await sendDailyWindowEmail(interactiveCalendar({
      data: {
        ...interactiveCalendar().data,
        tasks: [
          { day: 5, task: 'Wspólny wieczór', status: 'closed', catalogTaskId: 'set-1-task-5' },
        ],
      },
    }), 5, { force: true, triggeredBy: 'admin' });
    expect(result.success).toBe(true);
    const html = sendEmail.mock.calls[0][0].html;
    expect(html).toContain('okienko=5');
    expect(html).toContain('Otwórz dodatek');
    expect(html).not.toContain('Bożonarodzeniowego Quizu');
  });

  test('bulk today skips already sent unless force', async () => {
    Calendar.findEmailOpeningCalendars.mockResolvedValue([interactiveCalendar()]);
    EmailSend.hasSuccessfulDaily.mockResolvedValue(true);

    const skipped = await sendTodaysDailyWindows({
      force: false,
      triggeredBy: 'cron',
      now: new Date('2026-12-01T10:00:00+01:00'),
    });
    expect(skipped.skippedCount).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();

    const forced = await sendTodaysDailyWindows({
      force: true,
      triggeredBy: 'admin',
      now: new Date('2026-12-01T10:00:00+01:00'),
    });
    expect(forced.sent).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  test('bulk today outside advent is skipped', async () => {
    const result = await sendTodaysDailyWindows({
      now: new Date('2026-08-14T10:00:00+02:00'),
    });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('not_advent');
    expect(Calendar.findEmailOpeningCalendars).not.toHaveBeenCalled();
  });
});

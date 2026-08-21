const { sendEmail } = require('../config/email');
const { frontendUrl } = require('../config/app');
const { isPhysicalProduct } = require('../config/products');
const Calendar = require('../models/Calendar');
const Payment = require('../models/Payment');
const EmailSend = require('../models/EmailSend');
const {
  getTaskText,
  dailyWindowSubject,
  buildOrderConfirmationEmail,
  buildOrderConfirmationText,
  buildInteractiveAccessEmail,
  buildInteractiveAccessEmailText,
  buildShippingEmail,
  buildShippingEmailText,
  buildDailyWindowEmail,
  buildDailyWindowEmailText,
} = require('./orderEmails');
const { getAdventDay } = require('./adventDay');
const { formatOrderNumber } = require('../utils/orderNumber');
const {
  getSpecialDescriptor,
  isPremiumCalendar,
} = require('./special/SpecialConfigRegistry');

function generateAccessCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function MailerError(message, status = 400, code = 'MAILER_ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function calendarLink(calendar, { day } = {}) {
  const id = calendar._id || calendar.id;
  const base = `${frontendUrl}/kalendarz/${id}`;
  const n = parseInt(day, 10);
  if (Number.isInteger(n) && n >= 1 && n <= 24) {
    return `${base}?okienko=${n}`;
  }
  return base;
}

function dailyRecipient(calendar) {
  const data = calendar.data || {};
  return String(data.dailyContentEmail || data.email || '').trim().toLowerCase();
}

function orderLineItems(order) {
  if (Array.isArray(order.items) && order.items.length > 0) return order.items;
  if (order.sku) {
    return [{
      sku: order.sku,
      quantity: 1,
      unitPrice: order.amount,
      calendarId: order.productId || order.calendar_id || null,
      metadata: {},
    }];
  }
  return [];
}

/** Numer widoczny dla klienta (000001), nie UUID. */
function customerFacingOrderNumber(order) {
  return order.orderNumberDisplay
    || formatOrderNumber(order.orderNumber)
    || formatOrderNumber(order.order_number)
    || null;
}

async function dispatchAndLog({
  type,
  to,
  subject,
  html,
  text,
  orderId,
  calendarId,
  day,
  triggeredBy,
}) {
  try {
    const result = await sendEmail({ to, subject, text, html });
    try {
      await EmailSend.createSend({
        type,
        orderId,
        calendarId,
        day,
        recipientEmail: to,
        subject,
        status: 'sent',
        triggeredBy,
      });
    } catch (logErr) {
      console.error('Failed to log successful email send:', logErr.message);
    }
    return { success: true, messageId: result.messageId, recipient: to, type };
  } catch (error) {
    console.error(`Email ${type} failed:`, error.message);
    try {
      await EmailSend.createSend({
        type,
        orderId,
        calendarId,
        day,
        recipientEmail: to,
        subject,
        status: 'failed',
        errorMessage: error.message,
        triggeredBy,
      });
    } catch (logErr) {
      console.error('Failed to log email send:', logErr.message);
    }
    return { success: false, error: error.message, recipient: to, type };
  }
}

async function ensureInteractiveUnlocked(calendar) {
  let accessCode = calendar.accessCode;
  const updates = {};
  if (!accessCode) {
    accessCode = generateAccessCode();
    updates.accessCode = accessCode;
  }
  if (calendar.status !== 'succeeded') updates.status = 'succeeded';
  if (calendar.fulfillmentStatus !== 'delivered') updates.fulfillmentStatus = 'delivered';
  if (Object.keys(updates).length > 0) {
    calendar = await Calendar.updateCalendar(calendar._id || calendar.id, updates);
  }
  return { calendar, accessCode: calendar.accessCode || accessCode };
}

/**
 * Maile po opłaceniu: potwierdzenie (fizyczne) + dostęp do każdego kalendarza interaktywnego.
 * Dociąga kod dostępu, jeśli webhook go nie zdążył wygenerować.
 */
async function sendPaidOrderEmails(order, triggeredBy = 'webhook') {
  if (!order) throw MailerError('Zamówienie nie istnieje', 404, 'ORDER_NOT_FOUND');
  if (order.status !== 'succeeded') {
    throw MailerError('Zamówienie nie jest opłacone — nie można wysłać maila po płatności.', 400, 'NOT_PAID');
  }

  const items = orderLineItems(order);
  const hasPhysical = items.some((i) => isPhysicalProduct(i.sku))
    || ['scratch', 'letter'].includes(order.productType);
  const customerEmail = order.customerEmail;
  if (!customerEmail) throw MailerError('Brak adresu email klienta', 400, 'NO_EMAIL');

  const results = [];

  if (hasPhysical) {
    const subject = '🎄 Potwierdzenie zamówienia e-Advent';
    const payload = {
      orderId: customerFacingOrderNumber(order) || '—',
      items,
      shipping: order.shippingAddress || {},
      parcelLocker: order.parcelLocker || null,
      deliveryType: order.deliveryType,
      amount: order.amount,
      shippingAmount: order.shippingAmount,
      hasPhysical: true,
    };
    results.push(await dispatchAndLog({
      type: 'order_confirmation',
      to: customerEmail,
      subject,
      html: buildOrderConfirmationEmail(payload),
      text: buildOrderConfirmationText(payload),
      orderId: order.id,
      triggeredBy,
    }));
  }

  for (const item of items) {
    if (isPhysicalProduct(item.sku) || !item.calendarId) continue;
    const found = await Calendar.findCalendarById(item.calendarId);
    if (!found) {
      results.push({
        success: false,
        type: 'interactive_access',
        recipient: customerEmail,
        error: `Brak kalendarza ${item.calendarId}`,
      });
      continue;
    }
    const { calendar, accessCode } = await ensureInteractiveUnlocked(found);
    const calendarTitle = (calendar.data && calendar.data.title) || 'Twój Kalendarz Adwentowy';
    const link = calendarLink({ ...calendar, accessCode });
    const subject = `🎄 Twój Kalendarz Adwentowy: ${calendarTitle}`;
    results.push(await dispatchAndLog({
      type: 'interactive_access',
      to: customerEmail,
      subject,
      html: buildInteractiveAccessEmail({ calendarTitle, calendarLink: link, accessCode, subtitle: 'Twój kalendarz jest gotowy' }),
      text: buildInteractiveAccessEmailText({ calendarTitle, calendarLink: link, accessCode }),
      orderId: order.id,
      calendarId: calendar.id || calendar._id,
      triggeredBy,
    }));
  }

  return {
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

async function sendShippingEmailForOrder(order, triggeredBy = 'admin') {
  if (!order) throw MailerError('Zamówienie nie istnieje', 404, 'ORDER_NOT_FOUND');
  const items = orderLineItems(order);
  const hasPhysical = items.some((i) => isPhysicalProduct(i.sku))
    || ['scratch', 'letter'].includes(order.productType);
  if (!hasPhysical) {
    throw MailerError('To zamówienie nie zawiera produktów fizycznych.', 400, 'NOT_PHYSICAL');
  }
  const trackingNumber = String(order.trackingNumber || '').trim();
  if (!trackingNumber) {
    throw MailerError('Uzupełnij numer listu przewozowego przed wysłaniem maila o wysyłce.', 400, 'NO_TRACKING');
  }
  const customerEmail = order.customerEmail;
  if (!customerEmail) throw MailerError('Brak adresu email klienta', 400, 'NO_EMAIL');

  const subject = 'Twoja paczka e-Advent została wysłana';
  const payload = {
    orderId: customerFacingOrderNumber(order) || '—',
    items,
    trackingNumber,
    deliveryType: order.deliveryType,
    shipping: order.shippingAddress || {},
    parcelLocker: order.parcelLocker || null,
  };

  const result = await dispatchAndLog({
    type: 'shipping',
    to: customerEmail,
    subject,
    html: buildShippingEmail(payload),
    text: buildShippingEmailText(payload),
    orderId: order.id,
    triggeredBy,
  });

  return {
    sent: result.success ? 1 : 0,
    failed: result.success ? 0 : 1,
    results: [result],
  };
}

async function sendDailyWindowEmail(calendar, day, { force = true, triggeredBy = 'admin' } = {}) {
  if (!calendar) throw MailerError('Kalendarz nie istnieje', 404, 'CALENDAR_NOT_FOUND');
  const method = calendar.data && calendar.data.openingMethod;
  if (method !== 'email') {
    throw MailerError('Ten kalendarz nie ma wybranej wysyłki codziennego e-maila.', 400, 'NOT_EMAIL_METHOD');
  }
  if (calendar.status !== 'succeeded') {
    throw MailerError('Kalendarz nie jest opłacony.', 400, 'NOT_PAID');
  }

  const n = parseInt(day, 10);
  if (!Number.isInteger(n) || n < 1 || n > 24) {
    throw MailerError('Dzień musi być liczbą od 1 do 24.', 400, 'INVALID_DAY');
  }

  const to = dailyRecipient(calendar);
  if (!to) throw MailerError('Brak adresu daily_content_email.', 400, 'NO_EMAIL');

  if (!force) {
    const already = await EmailSend.hasSuccessfulDaily(calendar.id || calendar._id, n);
    if (already) {
      return {
        success: true,
        skipped: true,
        reason: 'already_sent',
        recipient: to,
        day: n,
        calendarId: calendar.id || calendar._id,
      };
    }
  }

  const tasks = (calendar.data && calendar.data.tasks) || [];
  const task = tasks.find((t) => Number(t.day) === n);
  if (!task) throw MailerError(`Brak zadania na dzień ${n}.`, 400, 'NO_TASK');

  const calendarTitle = (calendar.data && calendar.data.title) || 'Kalendarz adwentowy';
  const taskBody = getTaskText(task);
  const taskTitle = `Dzień ${n} — ${calendarTitle}`;
  const year = getAdventDay()?.year || new Date().getFullYear();
  const progressPercent = Math.round((n / 24) * 100);
  const isSpecial = isPremiumCalendar(calendar) && !!getSpecialDescriptor(task.catalogTaskId);
  const link = calendarLink(calendar, { day: n });
  const subject = dailyWindowSubject(n, calendarTitle);

  const result = await dispatchAndLog({
    type: 'daily_window',
    to,
    subject,
    html: buildDailyWindowEmail({
      day: n,
      year,
      taskTitle,
      taskBody,
      calendarTitle,
      progressPercent,
      calendarLink: link,
      isSpecial,
    }),
    text: buildDailyWindowEmailText({
      day: n,
      year,
      taskTitle,
      taskBody,
      calendarTitle,
      calendarLink: link,
      isSpecial,
    }),
    calendarId: calendar.id || calendar._id,
    day: n,
    triggeredBy,
  });

  if (result.success) {
    try {
      await Calendar.openTask(calendar.id || calendar._id, n);
    } catch (openErr) {
      console.error('Failed to mark task opened after daily email:', openErr.message);
    }
  }

  return {
    ...result,
    skipped: false,
    day: n,
    calendarId: calendar.id || calendar._id,
  };
}

async function sendTodaysDailyWindows({ force = false, triggeredBy = 'admin', now } = {}) {
  const advent = getAdventDay(now);
  if (!advent) {
    return {
      skipped: true,
      reason: 'not_advent',
      day: null,
      year: null,
      sent: 0,
      failed: 0,
      skippedCount: 0,
      results: [],
    };
  }

  const calendars = await Calendar.findEmailOpeningCalendars();
  const results = [];

  for (const calendar of calendars) {
    try {
      const outcome = await sendDailyWindowEmail(calendar, advent.day, { force, triggeredBy });
      results.push(outcome);
    } catch (error) {
      results.push({
        success: false,
        skipped: false,
        error: error.message,
        calendarId: calendar.id || calendar._id,
        recipient: dailyRecipient(calendar),
        day: advent.day,
        type: 'daily_window',
      });
    }
  }

  return {
    skipped: false,
    reason: null,
    day: advent.day,
    year: advent.year,
    sent: results.filter((r) => r.success && !r.skipped).length,
    failed: results.filter((r) => !r.success).length,
    skippedCount: results.filter((r) => r.skipped).length,
    results,
  };
}

async function previewTodaysDailyWindows(now) {
  const advent = getAdventDay(now);
  const calendars = await Calendar.findEmailOpeningCalendars();
  const ids = calendars.map((c) => c.id || c._id);

  if (!advent) {
    return {
      isAdvent: false,
      day: null,
      year: null,
      eligible: calendars.length,
      alreadySent: 0,
      remaining: 0,
    };
  }

  const alreadySent = await EmailSend.countSuccessfulDaily(advent.day, ids);
  return {
    isAdvent: true,
    day: advent.day,
    year: advent.year,
    eligible: calendars.length,
    alreadySent,
    remaining: Math.max(0, calendars.length - alreadySent),
  };
}

async function sendPaidOrderEmailsById(orderId, triggeredBy = 'admin') {
  const order = await Payment.findPaymentById(orderId);
  return sendPaidOrderEmails(order, triggeredBy);
}

async function sendShippingEmailById(orderId, triggeredBy = 'admin') {
  const order = await Payment.findPaymentById(orderId);
  return sendShippingEmailForOrder(order, triggeredBy);
}

module.exports = {
  generateAccessCode,
  sendPaidOrderEmails,
  sendPaidOrderEmailsById,
  sendShippingEmailForOrder,
  sendShippingEmailById,
  sendDailyWindowEmail,
  sendTodaysDailyWindows,
  previewTodaysDailyWindows,
  MailerError,
};

const express = require('express');
const router = express.Router();
const Calendar = require('../models/Calendar');

// Old orders retain their original format; new drafts can only produce A3.
function normalizeScratchProduct(data, existing = {}) {
  const merged = { ...existing, ...data };
  if (merged.productType !== 'scratch' && !String(merged.sku || '').startsWith('scratch') && merged.format !== 'A4') return;
  if ((merged.format && merged.format !== 'A3') || (merged.sku && merged.sku !== 'scratch-a3')) {
    throw Object.assign(new Error('Kalendarz zdrapka jest dostępny wyłącznie w formacie A3. Wróć do kreatora i wybierz aktualny produkt.'), { status: 400 });
  }
  data.productType = 'scratch';
  data.sku = 'scratch-a3';
  data.format = 'A3';
}
const { withNamedLocks } = require('../config/database');
const { cancelCalendarCheckout } = require('../services/checkoutPayment');
const { sendEmail } = require('../config/email');
const { body, validationResult } = require('express-validator');
const {
  isFullDiscountPromo,
  isSkuAllowedForPromo,
} = require('../config/promocodes');
const { createFreeLimiter, loginLimiter } = require('../middleware/rateLimits');
const {
  buildInteractiveAccessEmail,
  buildInteractiveAccessEmailText,
} = require('../services/orderEmails');
const { frontendUrl } = require('../config/app');
const { sanitizeTasksForClient, findTaskByDay } = require('../services/special/taskSanitizer');
const {
  getSpecialDescriptor,
  isPremiumCalendar,
  buildOpenedWindow,
} = require('../services/special/SpecialConfigRegistry');
const specialWindowsRouter = require('./specialWindows');

const { generateAccessCode } = require('../services/orderMailer');

function calendarToResponse(calendar, { includeEditToken = false } = {}) {
  if (!calendar) return null;
  const d = calendar.data || {};
  const response = {
    id: calendar._id || calendar.id,
    ...d,
    status: calendar.status,
    createdAt: calendar.createdAt,
    updatedAt: calendar.updatedAt,
  };
  if (response.tasks) {
    response.tasks = sanitizeTasksForClient(response.tasks, calendar);
  }
  if (includeEditToken && calendar.editToken) {
    response.editToken = calendar.editToken;
  }
  return response;
}

function extractEditToken(req) {
  return (
    req.headers['x-calendar-edit-token']
    || req.body?.editToken
    || req.body?.calendar?.editToken
    || null
  );
}

// ── POST /access ───────────────────────────────────────────────────────────────

router.post('/access', loginLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('accessCode').notEmpty().withMessage('Access code is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, accessCode } = req.body;
    const calendar = await Calendar.findCalendarByEmailAndAccessCode(email, accessCode);

    if (!calendar || calendar.status !== 'succeeded') {
      return res.status(404).json({
        error: 'Calendar not found',
        message: 'Nie znaleziono kalendarza dla podanego adresu email i kodu dostępu.',
      });
    }

    res.json({ success: true, calendar: calendarToResponse(calendar) });
  } catch (error) {
    console.error('Error retrieving calendar by email and accessCode:', error);
    res.status(error.status || 500).json({ error: 'Failed to retrieve calendar', message: error.message });
  }
});

function calendarLocked(handler) {
  return (req, res, next) => withNamedLocks([`calendar:${req.body.calendarId}`], () => handler(req, res)).catch(next);
}

// ── POST /createFree ───────────────────────────────────────────────────────────

router.post('/createFree', createFreeLimiter, [
  body('calendarId').notEmpty().withMessage('Calendar ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('promoCode').notEmpty().withMessage('Promo code is required'),
], calendarLocked(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { calendarId, email, promoCode } = req.body;

    if (!isFullDiscountPromo(promoCode)) {
      return res.status(403).json({
        error: 'Invalid promo code',
        message: 'Kod promocyjny jest nieprawidłowy lub nie uprawnia do darmowej aktywacji.',
      });
    }

    const calendar = await Calendar.findCalendarById(calendarId);
    if (!calendar) {
      return res.status(404).json({
        error: 'Calendar not found',
        message: `Kalendarz o ID ${calendarId} nie został znaleziony.`,
      });
    }

    if (calendar.status !== 'pending' && !(calendar.status === 'succeeded' && calendar.isFree)) {
      return res.status(400).json({
        error: 'Invalid calendar status',
        message: `Kalendarz ma status '${calendar.status}'. Darmowa aktywacja tylko dla statusu pending.`,
      });
    }

    if (!Calendar.verifyEditToken(calendar, extractEditToken(req))) {
      return res.status(403).json({ error: 'Forbidden', message: 'Brak ważnego tokena edycji kalendarza.' });
    }
    const ownerEmail = String(calendar.data?.email || '').trim().toLowerCase();
    if (!ownerEmail || ownerEmail !== String(email).trim().toLowerCase()) {
      return res.status(400).json({ error: 'Email mismatch', message: 'Adres musi być zgodny z adresem właściciela kalendarza.' });
    }
    const sku = calendar.data?.sku || 'interactive';
    if (!isSkuAllowedForPromo(promoCode, sku)) {
      return res.status(403).json({
        error: 'Promo not allowed for product',
        message: 'Ten kod promocyjny nie obejmuje wybranego produktu.',
      });
    }

    if (calendar.status === 'pending') await cancelCalendarCheckout(calendarId, { singleOnly: true });
    const accessCode = calendar.accessCode || generateAccessCode();
    const updatedCalendar = calendar.status === 'succeeded' ? calendar : await Calendar.updateCalendar(calendarId, {
      status: 'succeeded', isFree: true, accessCode, fulfillmentStatus: 'delivered',
    });
    if (!updatedCalendar) throw new Error('Calendar activation failed');

    const calendarData = updatedCalendar.data || calendar.data || {};
    const calendarTitle = calendarData.title || 'Twój Kalendarz Adwentowy';
    const calendarLink = `${frontendUrl}/kalendarz/${calendarId}`;
    const emailSubject = `🎄 Twój Kalendarz Adwentowy: ${calendarTitle}`;
    const emailHtml = buildInteractiveAccessEmail({
      calendarTitle,
      calendarLink,
      accessCode,
      subtitle: 'Twój kalendarz jest gotowy',
    });
    const emailText = buildInteractiveAccessEmailText({ calendarTitle, calendarLink, accessCode });

    const emailResult = await sendEmail({
      to: ownerEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    res.json({
      success: true,
      message: 'Kalendarz został pomyślnie aktywowany i email został wysłany',
      calendar: calendarToResponse(updatedCalendar),
      emailSent: true,
      emailMessageId: emailResult.messageId,
    });
  } catch (error) {
    console.error('Error creating free calendar:', error);
    res.status(error.status || 500).json({ error: 'Failed to create free calendar', message: error.message });
  }
}));

// ── POST /:id? — utwórz lub zaktualizuj kalendarz ─────────────────────────────

router.post('/:id?', [
  body('calendar').optional().isObject().withMessage('Calendar must be an object'),
  body('calendar.title').optional().isString(),
  body('calendar.author').optional().isString(),
  body('calendar.email').optional({ values: 'falsy' }).isEmail(),
  body('calendar.tasks').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idFromUrl = req.params.id;

    if (!req.body.calendar || typeof req.body.calendar !== 'object') {
      return res.status(400).json({
        error: 'Calendar data is required',
        message: 'Please provide calendar object in request body: { calendar: {...} }',
      });
    }

    // Ignore client-supplied id and status — server owns both
    const data = { ...req.body.calendar };
    delete data.id;
    delete data._id;
    delete data.status;
    delete data.editToken;

    const requestedId = idFromUrl || null;

    let calendar;
    let isUpdate = false;
    let editTokenToReturn = null;

    if (requestedId) {
      const existing = await Calendar.findCalendarById(requestedId);
      if (existing) {
        if (existing.status !== 'pending') {
          return res.status(400).json({
            error: 'Invalid calendar status',
            message: `Kalendarz ma status '${existing.status}'. Można aktualizować tylko kalendarze ze statusem 'pending'.`,
            currentStatus: existing.status,
          });
        }

        const token = extractEditToken(req);
        if (!Calendar.verifyEditToken(existing, token)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Brak ważnego tokena edycji kalendarza.',
          });
        }

        normalizeScratchProduct(data, existing.data);
        calendar = await Calendar.updateCalendarData(requestedId, data, existing.status);
        isUpdate = true;
        editTokenToReturn = existing.editToken;
      }
    }

    if (!calendar) {
      // Always create with server UUID — never accept client id
      normalizeScratchProduct(data);
      calendar = await Calendar.createCalendar({ data });
      editTokenToReturn = calendar.editToken;
    }

    res.status(isUpdate ? 200 : 201).json({
      success: true,
      calendar: calendarToResponse(calendar),
      editToken: editTokenToReturn,
    });
  } catch (error) {
    console.error('Error upserting calendar:', error);
    res.status(error.status || 500).json({ error: 'Failed to upsert calendar', message: error.message });
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Invalid request', message: 'Calendar ID is required' });
    }

    const calendar = await Calendar.findCalendarById(id);
    if (!calendar) {
      return res.status(404).json({
        error: 'Calendar not found',
        message: `Calendar with ID ${id} was not found`,
      });
    }

    res.json({ success: true, calendar: calendarToResponse(calendar) });
  } catch (error) {
    console.error('Error retrieving calendar:', error);
    res.status(error.status || 500).json({ error: 'Failed to retrieve calendar', message: error.message });
  }
});

// ── PUT /:id — zaktualizuj (tylko pending + editToken) ─────────────────────────

router.put('/:id', [
  body('calendar').optional().isObject(),
  body('calendar.title').optional().isString(),
  body('calendar.author').optional().isString(),
  body('calendar.email').optional({ values: 'falsy' }).isEmail(),
  body('calendar.tasks').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    if (!req.body.calendar || typeof req.body.calendar !== 'object') {
      return res.status(400).json({
        error: 'Calendar data is required',
        message: 'Please provide calendar object in request body: { calendar: {...} }',
      });
    }

    const data = { ...req.body.calendar };
    delete data.id;
    delete data._id;
    delete data.status;
    delete data.editToken;

    const existing = await Calendar.findCalendarById(id);

    if (existing) {
      if (existing.status !== 'pending') {
        return res.status(400).json({
          error: 'Invalid calendar status',
          message: `Kalendarz ma status '${existing.status}'. Można aktualizować tylko kalendarze ze statusem 'pending'.`,
          currentStatus: existing.status,
        });
      }

      const token = extractEditToken(req);
      if (!Calendar.verifyEditToken(existing, token)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Brak ważnego tokena edycji kalendarza.',
        });
      }

      normalizeScratchProduct(data, existing.data);
      const calendar = await Calendar.updateCalendarData(id, data, existing.status);
      return res.json({
        success: true,
        calendar: calendarToResponse(calendar),
        editToken: existing.editToken,
      });
    }

    // Do not allow creating via PUT with client-chosen id
    return res.status(404).json({
      error: 'Calendar not found',
      message: `Kalendarz o ID ${id} nie istnieje. Użyj POST /calendars aby utworzyć nowy.`,
    });
  } catch (error) {
    console.error('Error updating calendar:', error);
    res.status(error.status || 500).json({ error: 'Failed to update calendar', message: error.message });
  }
});

// ── PUT /:id/open/:day ─────────────────────────────────────────────────────────

router.put('/:id/open/:day', async (req, res) => {
  try {
    const { id, day } = req.params;
    const dayNum = parseInt(day, 10);

    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return res.status(400).json({ error: 'Invalid day', message: 'Day must be a number between 1 and 31' });
    }

    const calendar = await Calendar.findCalendarById(id);
    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    if (calendar.status !== 'succeeded') {
      return res.status(403).json({ error: 'Calendar is not active' });
    }
    const updated = await Calendar.openTask(id, dayNum);
    const d = updated.data || {};
    const openedTask = findTaskByDay(updated, dayNum);
    let openedWindow = null;

    if (openedTask && isPremiumCalendar(updated) && openedTask.catalogTaskId) {
      const descriptor = getSpecialDescriptor(openedTask.catalogTaskId);
      if (descriptor) {
        openedWindow = buildOpenedWindow(openedTask, descriptor);
      }
    }

    res.json({
      success: true,
      message: `Task for day ${dayNum} opened successfully`,
      calendar: {
        id: updated._id || updated.id,
        ...d,
        tasks: sanitizeTasksForClient(d.tasks || [], updated),
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
      ...(openedWindow ? { openedWindow } : {}),
    });
  } catch (error) {
    console.error('Error opening task:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(error.status || 500).json({ error: 'Failed to open task', message: error.message });
  }
});

router.use('/', specialWindowsRouter);

module.exports = router;

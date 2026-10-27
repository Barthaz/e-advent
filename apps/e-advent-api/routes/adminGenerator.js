'use strict';

const path = require('path');
const { body, param, query: qv, validationResult } = require('express-validator');
const { query } = require('../config/database');
const Calendar = require('../models/Calendar');
const { SANTA_CERTIFICATE_SKU } = require('../config/products');
const {
  buildCertificatePdf,
  certificateFilename,
  fail,
  normalizeVariant,
} = require('../services/certificate/certificatePdf');
const {
  GENERATOR_SERIAL_PREFIX,
  allocateGeneratorCertificateNumber,
  buildCertificateTasks,
  readCertificateMeta,
  readStoredGeneratorNumber,
  assertGeneratorCertificate,
} = require('../services/certificate/generatorSerial');
const { generateAccessCode } = require('../services/orderMailer');

const SCRATCH_COLOR_URLS = {
  green: '/designs/scratch/green.png',
  red: '/designs/scratch/red.png',
  blue: '/designs/scratch/blue.png',
};

function sendExportError(res, error) {
  const status = error.status || 500;
  console.error('Generator error:', error);
  return res.status(status).json({
    error: error.code || 'GENERATOR_FAILED',
    message: error.message || 'Nie udało się wykonać operacji generatora.',
  });
}

function validationFailed(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'VALIDATION', message: errors.array()[0].msg, errors: errors.array() });
    return true;
  }
  return false;
}

async function loadAdminRow(id) {
  const [rows] = await query('SELECT * FROM calendars WHERE id = ?', [String(id)]);
  return rows[0] || null;
}

function loadScratchPresets() {
  try {
    return require(path.join(__dirname, '../../../packages/content/catalog/scratch-presets.json'));
  } catch (error) {
    console.error('Failed to load scratch presets:', error.message);
    return [];
  }
}

function normalizeScratchTasks(rawTasks) {
  if (!Array.isArray(rawTasks)) return [];
  return rawTasks
    .map((t, index) => {
      const day = Number(t.day) || index + 1;
      const title = String(t.title || '').trim();
      const description = String(t.description ?? t.task ?? t.text ?? '').trim();
      if (day < 1 || day > 24) return null;
      return {
        day,
        title,
        description,
        task: description || title,
        status: 'closed',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.day - b.day);
}

function tasksFromPreset(presetId) {
  const presets = loadScratchPresets();
  const index = Number(presetId);
  const preset = Number.isInteger(index)
    ? presets[index]
    : presets.find((p) => p.name === presetId);
  if (!preset?.tasks?.length) return [];
  return normalizeScratchTasks(preset.tasks);
}

function normalizeInteractiveTasks(rawTasks) {
  const byDay = new Map();
  if (Array.isArray(rawTasks)) {
    for (const t of rawTasks) {
      const day = Number(t.day);
      if (!Number.isInteger(day) || day < 1 || day > 24) continue;
      const title = String(t.task ?? t.title ?? t.content ?? t.text ?? '').trim();
      byDay.set(day, {
        day,
        title,
        status: t.status || 'closed',
        ...(t.duration != null ? { duration: t.duration } : {}),
        ...(t.catalogTaskId ? { catalogTaskId: t.catalogTaskId } : {}),
      });
    }
  }
  const out = [];
  for (let day = 1; day <= 24; day += 1) {
    out.push(byDay.get(day) || { day, title: '', status: 'closed' });
  }
  return out;
}

/**
 * Register admin Generator routes. Does not create orders or send access emails.
 * @param {import('express').Router} router
 * @param {Function} authAdmin
 */
function registerGeneratorRoutes(router, authAdmin) {
  router.get('/generator', authAdmin, [
    qv('type').optional().isIn(['certificate', 'scratch', 'interactive']),
    qv('page').optional().isInt({ min: 1 }).toInt(),
    qv('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  ], async (req, res) => {
    if (validationFailed(req, res)) return;
    try {
      const type = req.query.type || undefined;
      const page = req.query.page || 1;
      const limit = req.query.limit || 50;
      const skip = (page - 1) * limit;
      const [rows, total] = await Promise.all([
        Calendar.findGeneratedCalendars({ type, limit, skip }),
        Calendar.countGeneratedCalendars({ type }),
      ]);
      res.json({
        items: rows.map((row) => Calendar.calendarRowToAdminJson(row)),
        total,
        page,
        limit,
      });
    } catch (error) {
      return sendExportError(res, error);
    }
  });

  router.post('/generator/certificates', authAdmin, [
    body('childName').isString().trim().isLength({ min: 2 }).withMessage('Imię musi mieć co najmniej 2 znaki.'),
    body('variant').notEmpty().withMessage('Wybierz wariant męski (ON) albo damski (ONA).'),
  ], async (req, res) => {
    if (validationFailed(req, res)) return;
    const variant = normalizeVariant(req.body.variant);
    if (!variant) {
      return sendExportError(res, fail('Wybierz wariant męski (ON) albo damski (ONA).', 400, 'BAD_VARIANT'));
    }
    const childName = String(req.body.childName || '').replace(/\s+/g, ' ').trim();
    try {
      const certificateNumber = await allocateGeneratorCertificateNumber();
      const created = await Calendar.createCalendar({
        data: {
          title: childName,
          author: variant,
          email: '',
          productType: 'certificate',
          sku: SANTA_CERTIFICATE_SKU,
          tasks: buildCertificateTasks({ childName, variant, certificateNumber }),
        },
      });
      await Calendar.setCalendarOrigin(created.id, 'generator');
      const row = await loadAdminRow(created.id);
      res.status(201).json({ calendar: Calendar.calendarRowToAdminJson(row) });
    } catch (error) {
      return sendExportError(res, error);
    }
  });

  router.get('/generator/certificates/:id/pdf', authAdmin, [
    param('id').isUUID().withMessage('Nieprawidłowy identyfikator certyfikatu.'),
    qv('variant').optional().isString(),
  ], async (req, res) => {
    if (validationFailed(req, res)) return;
    try {
      const row = await loadAdminRow(req.params.id);
      assertGeneratorCertificate(row);
      const meta = readCertificateMeta(row.tasks);
      const childName = String(row.title || meta.childName || '').trim();
      const variant = normalizeVariant(req.query.variant || row.author || meta.variant);
      if (!variant) {
        throw fail('Wybierz wariant męski (ON) albo damski (ONA).', 400, 'BAD_VARIANT');
      }
      const serialNumber = readStoredGeneratorNumber(row.tasks)
        || await allocateGeneratorCertificateNumber(row.tasks);
      const pdfBuffer = await buildCertificatePdf({
        variant,
        childName,
        serialNumber,
        serialPrefix: GENERATOR_SERIAL_PREFIX,
      });
      const filename = certificateFilename({
        variant,
        serialNumber,
        serialPrefix: GENERATOR_SERIAL_PREFIX,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (error) {
      return sendExportError(res, error);
    }
  });

  router.post('/generator/scratch', authAdmin, [
    body('title').optional().isString(),
    body('color').optional().isIn(['green', 'red', 'blue']),
    body('presetId').optional(),
    body('tasks').optional().isArray(),
  ], async (req, res) => {
    if (validationFailed(req, res)) return;
    const color = req.body.color || 'red';
    const designUrl = SCRATCH_COLOR_URLS[color];
    if (!designUrl) {
      return sendExportError(res, fail('Wybierz kolor: green, red albo blue.', 400, 'BAD_COLOR'));
    }
    let tasks = [];
    if (req.body.presetId != null && req.body.presetId !== '') {
      tasks = tasksFromPreset(req.body.presetId);
      if (!tasks.length) {
        return sendExportError(res, fail('Nie znaleziono wybranego szablonu zdrapki.', 400, 'BAD_PRESET'));
      }
    } else {
      tasks = normalizeScratchTasks(req.body.tasks);
    }
    if (!tasks.length) {
      return sendExportError(res, fail('Podaj szablon albo treść okienek zdrapki.', 400, 'MISSING_TASKS'));
    }
    try {
      const created = await Calendar.createCalendar({
        data: {
          title: String(req.body.title || '').trim() || 'Kalendarz zdrapka',
          author: 'Generator',
          email: '',
          productType: 'scratch',
          sku: 'scratch-a3',
          format: 'A3',
          design: { imageUrl: designUrl },
          tasks,
        },
      });
      await Calendar.setCalendarOrigin(created.id, 'generator');
      const row = await loadAdminRow(created.id);
      res.status(201).json({ calendar: Calendar.calendarRowToAdminJson(row) });
    } catch (error) {
      return sendExportError(res, error);
    }
  });

  router.post('/generator/interactive', authAdmin, [
    body('email').isEmail().withMessage('Podaj poprawny adres e-mail.').normalizeEmail(),
    body('openingMethod').isIn(['app', 'email', 'online']).withMessage('Wybierz sposób otwierania: app, email albo online.'),
    body('title').optional().isString(),
    body('dailyContentEmail').optional({ nullable: true }).isString(),
    body('tasks').optional().isArray(),
  ], async (req, res) => {
    if (validationFailed(req, res)) return;
    const email = String(req.body.email || '').trim().toLowerCase();
    const openingMethod = req.body.openingMethod;
    const dailyContentEmail = openingMethod === 'email'
      ? (String(req.body.dailyContentEmail || '').trim().toLowerCase() || email)
      : null;
    const tasks = normalizeInteractiveTasks(req.body.tasks);
    try {
      const created = await Calendar.createCalendar({
        data: {
          title: String(req.body.title || '').trim() || 'Kalendarz interaktywny',
          author: 'Generator',
          email,
          productType: 'interactive',
          sku: 'interactive',
          openingMethod,
          dailyContentEmail,
          tasks,
        },
      });
      await Calendar.setCalendarOrigin(created.id, 'generator');
      const accessCode = generateAccessCode();
      await Calendar.updateCalendar(created.id, {
        status: 'succeeded',
        accessCode,
        isFree: true,
        fulfillmentStatus: 'delivered',
      });
      const row = await loadAdminRow(created.id);
      res.status(201).json({
        calendar: Calendar.calendarRowToAdminJson(row),
        accessCode: row.access_code || accessCode,
      });
    } catch (error) {
      return sendExportError(res, error);
    }
  });
}

module.exports = { registerGeneratorRoutes };

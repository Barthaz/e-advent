'use strict';

const express = require('express');
const Calendar = require('../models/Calendar');
const {
  getSpecialDescriptor,
  isPremiumCalendar,
  buildOpenedWindow,
} = require('../services/special/SpecialConfigRegistry');
const SpecialProgressStore = require('../services/special/SpecialProgressStore');
const { findTaskByDay } = require('../services/special/taskSanitizer');
const { renderSpecialPdf, resolveContentPack } = require('../services/special/DocumentRegistry');
const { canCompleteEngine } = require('../services/special/completionRules');
const {
  sealContent,
  getSealedContent,
  resolveRevealAt,
} = require('../services/special/DateGateService');
const { uploadLimiter } = require('../middleware/rateLimits');
const { imageUpload, storeImage } = require('../services/imageStore');
const { sniffImageFormat, uploadRejectMessage, HEIC_ERROR, FORMAT_ERROR } = require('../services/imageFormat');

const router = express.Router({ mergeParams: true });

function hasDateGate(descriptor) {
  return !!descriptor?.capabilities?.dateGate;
}

function payloadHasSealedContent(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const fields = payload.fields;
  if (fields && typeof fields === 'object' && Object.values(fields).some((v) => String(v || '').trim())) {
    return true;
  }
  if (typeof payload.name === 'string' && payload.name.trim()) return true;
  if (Array.isArray(payload.cards) && payload.cards.some((card) => {
    if (!card || typeof card !== 'object') return false;
    if (String(card.name || '').trim()) return true;
    const cardFields = card.fields;
    return !!(cardFields && typeof cardFields === 'object'
      && Object.values(cardFields).some((v) => String(v || '').trim()));
  })) {
    return true;
  }
  return false;
}

function redactDateGatedPayload(payload) {
  if (!payload || typeof payload !== 'object') return { dateGateLocked: true };
  const next = { ...payload, dateGateLocked: true };
  if (next.fields && typeof next.fields === 'object') {
    next.fields = Object.fromEntries(Object.keys(next.fields).map((key) => [key, '']));
  }
  if (typeof next.name === 'string') next.name = '';
  if (Array.isArray(next.cards)) {
    next.cards = next.cards.map((card) => {
      if (!card || typeof card !== 'object') return card;
      const redacted = { ...card };
      if (typeof redacted.name === 'string') redacted.name = '';
      if (redacted.fields && typeof redacted.fields === 'object') {
        redacted.fields = Object.fromEntries(Object.keys(redacted.fields).map((key) => [key, '']));
      }
      return redacted;
    });
  }
  return next;
}

function redactDateGatedProgress(progress) {
  if (!progress) return progress;
  return {
    ...progress,
    payload: redactDateGatedPayload(progress.payload),
  };
}

async function attachDateGate(calendarId, taskId, descriptor, progress) {
  if (!hasDateGate(descriptor)) {
    return { progress, dateGate: undefined };
  }
  const sealed = await getSealedContent(calendarId, taskId);
  const dateGate = {
    revealed: sealed.revealed,
    revealAt: sealed.revealAt || null,
  };
  if (sealed.sealed && !sealed.revealed) {
    return { progress: redactDateGatedProgress(progress), dateGate };
  }
  return { progress, dateGate };
}

function resolveSealRevealAt(body, descriptor) {
  const pack = descriptor?.contentKey ? resolveContentPack(descriptor.contentKey) : null;
  const raw = body?.revealAt ?? pack?.revealAt;
  return resolveRevealAt(raw);
}

async function authorizeCalendar(req, res) {
  const { id } = req.params;
  const calendar = await Calendar.findCalendarById(id);
  if (!calendar) {
    res.status(404).json({ error: 'Calendar not found' });
    return null;
  }
  // UUID in the URL is the capability token; access code is only for
  // email+code recovery when the recipient lost the link.
  return calendar;
}

function getOpenedTask(calendar, dayNum) {
  const task = findTaskByDay(calendar, dayNum);
  if (!task || task.status !== 'opened') {
    return null;
  }
  return task;
}

router.get('/:id/days/:day/special/progress', async (req, res) => {
  try {
    const calendar = await authorizeCalendar(req, res);
    if (!calendar) return;

    const dayNum = parseInt(req.params.day, 10);
    const task = getOpenedTask(calendar, dayNum);
    if (!task?.catalogTaskId) {
      return res.status(404).json({ error: 'No special progress for this day' });
    }

    const descriptor = getSpecialDescriptor(task.catalogTaskId);
    const progress = await SpecialProgressStore.getProgress(calendar.id, task.catalogTaskId);
    const { progress: safeProgress, dateGate } = await attachDateGate(
      calendar.id,
      task.catalogTaskId,
      descriptor,
      progress,
    );
    const body = { success: true, progress: safeProgress };
    if (dateGate) body.dateGate = dateGate;
    res.json(body);
  } catch (error) {
    console.error('GET special progress:', error);
    res.status(500).json({ error: 'Failed to load progress', message: error.message });
  }
});

router.put('/:id/days/:day/special/progress', async (req, res) => {
  try {
    const calendar = await authorizeCalendar(req, res);
    if (!calendar) return;

    const dayNum = parseInt(req.params.day, 10);
    const task = getOpenedTask(calendar, dayNum);
    if (!task?.catalogTaskId) {
      return res.status(404).json({ error: 'No special window for this day' });
    }

    if (!isPremiumCalendar(calendar)) {
      return res.status(403).json({ error: 'Premium only' });
    }

    const descriptor = getSpecialDescriptor(task.catalogTaskId);
    const body = req.body || {};
    const progress = await SpecialProgressStore.upsertProgress(
      calendar.id,
      dayNum,
      task.catalogTaskId,
      descriptor?.configId || task.catalogTaskId,
      body,
    );

    let responseProgress = progress;
    let dateGate;
    if (hasDateGate(descriptor) && body.seal === true) {
      const revealAt = resolveSealRevealAt(body, descriptor);
      const sealedPayload = progress?.payload || body.payload || {};
      const sealed = await sealContent(calendar.id, task.catalogTaskId, revealAt, sealedPayload);
      dateGate = { revealed: false, revealAt: sealed.revealAt };
      responseProgress = redactDateGatedProgress(progress);
    } else if (hasDateGate(descriptor)) {
      const attached = await attachDateGate(calendar.id, task.catalogTaskId, descriptor, progress);
      responseProgress = attached.progress;
      dateGate = attached.dateGate;
    }

    const resBody = { success: true, progress: responseProgress };
    if (dateGate) resBody.dateGate = dateGate;
    res.json(resBody);
  } catch (error) {
    console.error('PUT special progress:', error);
    res.status(500).json({ error: 'Failed to save progress', message: error.message });
  }
});

router.post('/:id/days/:day/special/complete', async (req, res) => {
  try {
    const calendar = await authorizeCalendar(req, res);
    if (!calendar) return;

    const dayNum = parseInt(req.params.day, 10);
    const task = getOpenedTask(calendar, dayNum);
    if (!task?.catalogTaskId) {
      return res.status(404).json({ error: 'No special window for this day' });
    }

    const descriptor = getSpecialDescriptor(task.catalogTaskId);
    if (!descriptor) {
      return res.status(404).json({ error: 'Special config not found' });
    }

    const progress = await SpecialProgressStore.getProgress(calendar.id, task.catalogTaskId);
    const completion = canCompleteEngine({
      engine: descriptor.engine,
      completionRule: descriptor.completionRule || { type: 'MANUAL_OR_ENGINE_DEFAULT' },
      payload: progress?.payload || req.body?.payload || {},
    });

    if (!completion.canComplete && !req.body?.force) {
      return res.status(400).json({ error: 'Cannot complete', reason: completion.reason });
    }

    if (hasDateGate(descriptor)) {
      const sealed = await getSealedContent(calendar.id, task.catalogTaskId);
      const payload = progress?.payload || req.body?.payload || {};
      if (!sealed.sealed && payloadHasSealedContent(payload)) {
        const revealAt = resolveSealRevealAt(req.body || {}, descriptor);
        await sealContent(calendar.id, task.catalogTaskId, revealAt, payload);
      }
    }

    const updated = await SpecialProgressStore.markCompleted(calendar.id, task.catalogTaskId);
    const { progress: safeProgress, dateGate } = await attachDateGate(
      calendar.id,
      task.catalogTaskId,
      descriptor,
      updated,
    );
    const resBody = { success: true, progress: safeProgress };
    if (dateGate) resBody.dateGate = dateGate;
    res.json(resBody);
  } catch (error) {
    console.error('POST special complete:', error);
    res.status(500).json({ error: 'Failed to complete', message: error.message });
  }
});

function handleImageUpload(req, res, next) {
  imageUpload.single('image')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Zdjęcie może mieć maksymalnie 10 MB.'
      : (err.message || FORMAT_ERROR);
    return res.status(400).json({ error: message });
  });
}

router.post(
  '/:id/days/:day/special/upload',
  uploadLimiter,
  handleImageUpload,
  async (req, res) => {
    try {
      const calendar = await authorizeCalendar(req, res);
      if (!calendar) return;

      const dayNum = parseInt(req.params.day, 10);
      const task = getOpenedTask(calendar, dayNum);
      if (!task?.catalogTaskId) {
        return res.status(404).json({ error: 'Day not opened or no catalog task' });
      }
      if (!isPremiumCalendar(calendar)) {
        return res.status(403).json({ error: 'Premium only' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'Brak pliku grafiki' });
      }

      const format = sniffImageFormat(req.file.buffer);
      if (format === 'heic') {
        return res.status(400).json({ error: HEIC_ERROR });
      }
      if (!format) {
        return res.status(400).json({ error: uploadRejectMessage(req.file) });
      }

      const slot = String(req.body?.slot || 'photo').replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'photo';
      const folder = `special/${calendar.id}/${task.catalogTaskId}/${slot}`;
      const originalName = format === 'jpeg' ? `${slot}.jpg` : `${slot}.${format}`;
      const mime = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
      const result = await storeImage(req.file.buffer, originalName, mime, folder);

      res.json({
        success: true,
        slot,
        imageUrl: result.imageUrl,
        imageKey: result.imageKey,
      });
    } catch (error) {
      console.error('POST special upload:', error);
      res.status(500).json({ error: error.message || 'Błąd podczas uploadu grafiki' });
    }
  },
);

router.post('/:id/days/:day/special/export/pdf', async (req, res) => {
  try {
    const calendar = await authorizeCalendar(req, res);
    if (!calendar) return;

    const dayNum = parseInt(req.params.day, 10);
    const task = getOpenedTask(calendar, dayNum);
    if (!task?.catalogTaskId) {
      return res.status(404).json({ error: 'Day not opened or no catalog task' });
    }

    if (!isPremiumCalendar(calendar)) {
      return res.status(403).json({ error: 'Premium export not allowed' });
    }

    const descriptor = getSpecialDescriptor(task.catalogTaskId);
    if (!descriptor?.document || descriptor.capabilities?.canPrint === false) {
      return res.status(400).json({ error: 'This special window has no PDF export' });
    }

    const client = String(req.body?.client || '').toLowerCase();
    if (client === 'mobile' && !descriptor.capabilities?.canPrintMobile) {
      return res.status(400).json({
        error: 'This special window has no mobile PDF export',
        message: 'Tę grę najlepiej rozegrać na ekranie — PDF jest dostępny na stronie.',
      });
    }

    let payload = {};
    try {
      const progress = await SpecialProgressStore.getProgress(calendar.id, task.catalogTaskId);
      payload = progress?.payload || {};
    } catch (progressError) {
      console.warn('PDF export: progress lookup skipped:', progressError.message);
    }

    if (req.body?.payload && typeof req.body.payload === 'object') {
      payload = { ...payload, ...req.body.payload };
    }

    if (descriptor.contentKey) {
      const pack = resolveContentPack(descriptor.contentKey);
      if (pack && !payload.items) {
        payload = { ...pack, ...payload };
      }
    }

    const variant = req.body?.variant === 'INK_SAVER' ? 'INK_SAVER' : 'COLOR';
    const layout = req.body?.layout;
    const { buffer, filename } = await renderSpecialPdf(descriptor, payload, variant, layout);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('POST special export/pdf:', error);
    const message = String(error?.message || '');
    if (/could not be decoded|wstawić zdjęcia do PDF/i.test(message)) {
      return res.status(400).json({
        error: 'Nie udało się wstawić zdjęcia do PDF. Wczytaj je ponownie jako JPG lub PNG.',
      });
    }
    res.status(500).json({ error: 'PDF render failed', message: error.message });
  }
});

module.exports = router;

'use strict';

const express = require('express');
const { rateLimit } = require('../middleware/rateLimits');
const { canSell, publicConfig } = require('../services/santaMessages/config');
const { isTokenShape, verifyAudioSignature } = require('../services/santaMessages/crypto');
const drafts = require('../services/santaMessages/drafts');
const santa = require('../services/santaMessages/fulfillment');

const router = express.Router();
const isTestEnv = process.env.NODE_ENV === 'test';

function limiter(max, extra = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTestEnv ? 10000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests', message: 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.' },
    ...extra,
  });
}

const draftCreateLimiter = limiter(30);
const draftLimiter = limiter(200);
const tokenLimiter = limiter(40, { skipSuccessfulRequests: true });
const audioLimiter = limiter(600);

function privateHeaders(res) {
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
  });
}

function validationError(res, errors) {
  return res.status(422).json({ error: 'VALIDATION', message: 'Popraw zaznaczone pola.', errors });
}

function serverError(res, scope, error) {
  console.error(`[santa] ${scope} failed:`, error.code || error.message);
  return res.status(500).json({ error: 'SANTA_ERROR', message: 'Coś poszło nie tak. Spróbuj ponownie za chwilę.' });
}

const CONFLICT_MESSAGES = {
  NOT_EDITABLE: 'Tej wiadomości nie można już edytować — nagranie jest w przygotowaniu.',
  EDIT_LIMIT: 'Wykorzystano limit poprawek. Napisz do nas, jeśli coś wymaga zmiany.',
  NOT_APPROVABLE: 'Tekst został już zatwierdzony albo wymaga uzupełnienia danych.',
};

router.get('/config', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json(publicConfig());
});

/* ---------- drafts (before purchase) ---------- */

router.post('/drafts', draftCreateLimiter, async (req, res) => {
  const mode = req.body?.mode === 'letter_addon' ? 'letter_addon' : 'standalone';
  if (!canSell(mode)) return res.status(404).json({ error: 'NOT_AVAILABLE', message: 'Produkt jest chwilowo niedostępny.' });
  try {
    const result = await drafts.createDraft({ mode, personalization: req.body?.personalization });
    if (result.errors) return validationError(res, result.errors);
    privateHeaders(res);
    return res.status(201).json(result.draft);
  } catch (error) {
    return serverError(res, 'draft create', error);
  }
});

router.get('/drafts/:id', draftLimiter, async (req, res) => {
  try {
    const draft = await drafts.getDraft(req.params.id, req.get('X-Santa-Draft-Key'));
    privateHeaders(res);
    if (!draft) return res.status(404).json({ error: 'NOT_FOUND', message: 'Wersja robocza wygasła.' });
    return res.json(draft);
  } catch (error) {
    return serverError(res, 'draft read', error);
  }
});

router.put('/drafts/:id', draftLimiter, async (req, res) => {
  try {
    const result = await drafts.updateDraft(req.params.id, req.get('X-Santa-Draft-Key'), {
      mode: req.body?.mode,
      personalization: req.body?.personalization,
    });
    privateHeaders(res);
    if (result.notFound) return res.status(404).json({ error: 'NOT_FOUND', message: 'Wersja robocza wygasła.' });
    if (result.locked) return res.status(409).json({ error: 'LOCKED', message: 'Ta wiadomość została już zamówiona.' });
    if (result.errors) return validationError(res, result.errors);
    return res.json(result.draft);
  } catch (error) {
    return serverError(res, 'draft update', error);
  }
});

/* ---------- activation link (after purchase) ---------- */

async function withActivation(req, res, handler) {
  privateHeaders(res);
  if (!isTokenShape(req.params.token)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Link jest nieprawidłowy albo wygasł.' });
  try {
    const instance = await santa.findByToken('activate', req.params.token);
    if (!instance || ['CANCELLED', 'EXPIRED'].includes(instance.status)) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Link jest nieprawidłowy albo wygasł.' });
    }
    return await handler(instance);
  } catch (error) {
    return serverError(res, 'activation', error);
  }
}

router.get('/activate/:token', tokenLimiter, (req, res) => withActivation(req, res, async (instance) => (
  res.json(await santa.activationView(instance))
)));

router.post('/activate/:token/submit', tokenLimiter, (req, res) => withActivation(req, res, async (instance) => {
  const result = await santa.submitPersonalization(instance, req.body?.personalization);
  if (result.errors) return validationError(res, result.errors);
  if (result.conflict) return res.status(409).json({ error: result.conflict, message: CONFLICT_MESSAGES[result.conflict] });
  const fresh = await santa.findByToken('activate', req.params.token);
  return res.json(await santa.activationView(fresh));
}));

router.post('/activate/:token/approve', tokenLimiter, (req, res) => withActivation(req, res, async (instance) => {
  const result = await santa.approveScript(instance);
  if (result.conflict) return res.status(409).json({ error: result.conflict, message: CONFLICT_MESSAGES[result.conflict] });
  const fresh = await santa.findByToken('activate', req.params.token);
  return res.json(await santa.activationView(fresh));
}));

/* ---------- playback ---------- */

async function withPlayable(req, res, handler) {
  privateHeaders(res);
  if (!isTokenShape(req.params.token)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Link jest nieprawidłowy albo wygasł.' });
  try {
    const instance = await santa.findByToken('play', req.params.token);
    if (!instance) return res.status(404).json({ error: 'NOT_FOUND', message: 'Link jest nieprawidłowy albo wygasł.' });
    if (instance.status === 'EXPIRED') return res.status(410).json({ error: 'EXPIRED', message: 'Nagranie nie jest już dostępne.' });
    if (instance.status !== 'DELIVERED' || !instance.audio_key) {
      return res.status(409).json({ error: 'NOT_READY', message: 'Wiadomość jest jeszcze w przygotowaniu.' });
    }
    return await handler(instance);
  } catch (error) {
    return serverError(res, 'playback', error);
  }
}

router.get('/play/:token', tokenLimiter, (req, res) => withPlayable(req, res, async (instance) => (
  res.json(await santa.playbackView(instance))
)));

router.post('/play/:token/refresh-audio', tokenLimiter, (req, res) => withPlayable(req, res, async (instance) => (
  res.json(await santa.playbackView(instance))
)));

const audioCache = new Map();

async function cachedAudio(id) {
  const hit = audioCache.get(id);
  if (hit && Date.now() - hit.at < 120_000) return hit.buffer;
  const buffer = await santa.audioForStreaming(id);
  if (buffer) {
    audioCache.set(id, { buffer, at: Date.now() });
    if (audioCache.size > 8) audioCache.delete(audioCache.keys().next().value);
  }
  return buffer;
}

/** Streams MP3 with Range support; the URL is short-lived and HMAC-signed. */
function sendMp3(req, res, buffer, { download = false } = {}) {
  const total = buffer.length;
  res.set({
    'Content-Type': 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
  });
  if (download) res.set('Content-Disposition', 'attachment; filename="wiadomosc-od-swietego-mikolaja.mp3"');
  const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (!match || (!match[1] && !match[2])) {
    res.set('Content-Length', String(total));
    return res.status(200).end(buffer);
  }
  let start = match[1] ? Number(match[1]) : Math.max(0, total - Number(match[2]));
  let end = match[1] && match[2] ? Number(match[2]) : total - 1;
  end = Math.min(end, total - 1);
  if (start > end || start >= total) {
    res.set('Content-Range', `bytes */${total}`);
    return res.status(416).end();
  }
  start = Math.max(0, start);
  res.set({ 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(end - start + 1) });
  return res.status(206).end(buffer.subarray(start, end + 1));
}

router.get('/audio/:id', audioLimiter, async (req, res) => {
  const exp = Number(req.query.exp);
  const download = req.query.dl === '1';
  if (!drafts.UUID.test(req.params.id) || !Number.isFinite(exp) || exp * 1000 < Date.now()
      || !verifyAudioSignature(req.params.id, exp, download, req.query.sig)) {
    return res.status(403).json({ error: 'LINK_EXPIRED', message: 'Odśwież stronę, aby ponownie odtworzyć nagranie.' });
  }
  try {
    const buffer = await cachedAudio(req.params.id);
    if (!buffer) return res.status(404).json({ error: 'NOT_FOUND' });
    return sendMp3(req, res, buffer, { download });
  } catch (error) {
    return serverError(res, 'audio stream', error);
  }
});

module.exports = router;
module.exports.sendMp3 = sendMp3;

'use strict';

const multer = require('multer');
const santa = require('../services/santaMessages/fulfillment');
const { UUID } = require('../services/santaMessages/drafts');
const { sendMp3 } = require('./santaMessages');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
});

const MESSAGES = {
  CLOSED: 'Wiadomość jest anulowana lub wygasła.',
  NO_SCRIPT: 'Najpierw klient musi uzupełnić personalizację.',
  NOT_APPROVED: 'Najpierw klient musi zatwierdzić tekst wiadomości.',
  NOT_PAID: 'Zamówienie nie jest opłacone.',
  NOT_EDITABLE: 'Tekstu nie można już zmienić na tym etapie.',
  NOT_RETRYABLE: 'Ponowienie syntezy jest możliwe tylko dla wiadomości wymagających uwagi.',
  NOTHING_TO_RESEND: 'Na tym etapie nie ma linku do ponownej wysyłki.',
  AUDIO_MISSING: 'Brak nagrania — wgraj MP3 albo uruchom syntezę.',
  NOT_READY: 'Nagranie nie jest gotowe do wysyłki.',
};

function respond(res, result) {
  if (result?.notFound) return res.status(404).json({ error: 'NOT_FOUND', message: 'Nie znaleziono wiadomości.' });
  if (result?.conflict) return res.status(409).json({ error: result.conflict, message: MESSAGES[result.conflict] || result.conflict });
  if (result?.errors) return res.status(422).json({ error: 'VALIDATION', message: 'Tekst jest nieprawidłowy lub za długi.', errors: result.errors });
  return res.json({ success: true, ...result });
}

function fail(res, scope, error) {
  if (error.status === 400) {
    if (String(error.code || '').startsWith('R2_')) console.error(`[santa admin] ${scope} failed:`, error.code, error.message);
    return res.status(400).json({ error: error.code || 'BAD_REQUEST', message: error.message });
  }
  console.error(`[santa admin] ${scope} failed:`, error.code || error.message);
  return res.status(500).json({ error: 'SANTA_ADMIN_ERROR', message: 'Operacja nie powiodła się.' });
}

function validId(req, res, next) {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'BAD_ID', message: 'Nieprawidłowy identyfikator.' });
  return next();
}

module.exports = (router, authAdmin) => {
  router.get('/santa-messages', authAdmin, async (req, res) => {
    try {
      res.json(await santa.listInstances({
        status: typeof req.query.status === 'string' && /^[A-Z_]{3,40}$/.test(req.query.status) ? req.query.status : null,
        q: typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 120) : null,
        limit: req.query.limit,
        offset: req.query.offset,
      }));
    } catch (error) {
      fail(res, 'list', error);
    }
  });

  router.get('/santa-messages/:id', authAdmin, validId, async (req, res) => {
    try {
      const detail = await santa.instanceDetail(req.params.id);
      if (!detail) return res.status(404).json({ error: 'NOT_FOUND', message: 'Nie znaleziono wiadomości.' });
      return res.json(detail);
    } catch (error) {
      return fail(res, 'detail', error);
    }
  });

  router.get('/santa-messages/:id/audio', authAdmin, validId, async (req, res) => {
    try {
      const buffer = await santa.adminAudio(req.params.id);
      if (!buffer) return res.status(404).json({ error: 'NOT_FOUND', message: 'Brak nagrania.' });
      return sendMp3(req, res, buffer);
    } catch (error) {
      return fail(res, 'audio', error);
    }
  });

  const singleAudio = (req, res, next) => upload.single('audio')(req, res, (error) => {
    if (!error) return next();
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Plik jest za duży (maks. 4 MB).' : 'Nie udało się odczytać pliku.';
    return res.status(400).json({ error: error.code || 'UPLOAD_FAILED', message });
  });

  router.post('/santa-messages/:id/audio', authAdmin, validId, singleAudio, async (req, res) => {
    if (!req.file?.buffer?.length) return res.status(400).json({ error: 'NO_FILE', message: 'Wybierz plik MP3.' });
    try {
      return respond(res, await santa.adminUploadAudio(req.params.id, req.file.buffer));
    } catch (error) {
      return fail(res, 'upload', error);
    }
  });

  router.post('/santa-messages/:id/r2-audio', authAdmin, validId, async (req, res) => {
    try {
      return respond(res, await santa.adminAttachR2Audio(req.params.id, req.body?.objectKey));
    } catch (error) {
      return fail(res, 'attach R2', error);
    }
  });

  const actions = {
    deliver: (id) => santa.deliverAudio(id, 'admin'),
    resend: (id) => santa.adminResendLink(id),
    'revoke-play-link': (id) => santa.adminRevokePlayLink(id),
    'retry-tts': (id) => santa.adminRetryTts(id),
    cancel: (id) => santa.adminCancel(id),
  };

  router.post('/santa-messages/:id/:action', authAdmin, validId, async (req, res, next) => {
    const action = actions[req.params.action];
    if (!action) return next();
    try {
      return respond(res, await action(req.params.id));
    } catch (error) {
      return fail(res, req.params.action, error);
    }
  });

  router.put('/santa-messages/:id/script', authAdmin, validId, async (req, res) => {
    try {
      return respond(res, await santa.adminUpdateScript(req.params.id, req.body?.text));
    } catch (error) {
      return fail(res, 'script', error);
    }
  });
};

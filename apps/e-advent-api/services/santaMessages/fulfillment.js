'use strict';

const { randomUUID } = require('node:crypto');
const { query, withTransaction } = require('../../config/database');
const { isVoiceMessageSku, VOICE_MESSAGE_SKU, VOICE_MESSAGE_ADDON_SKU } = require('../../config/products');
const { formatOrderNumber } = require('../../utils/orderNumber');
const { santaConfig, ttsConfigured } = require('./config');
const { deriveToken, tokenHash, encryptJson, decryptJson, audioSignature } = require('./crypto');
const { validatePersonalization } = require('./validation');
const { buildSantaScript, countWords, WORDS_PER_SECOND } = require('./script');
const { loadDraftById, markDraftOrdered } = require('./drafts');
const { deliverSantaEmail, activationUrl, playUrl } = require('./emails');
const { saveAudio, readAudio, deleteAudio } = require('./audioStore');
const { readR2Audio, storageInfo } = require('./r2');
const { mp3Info } = require('./mp3');

const STATUS = Object.freeze({
  AWAITING_PERSONALIZATION: 'AWAITING_PERSONALIZATION',
  SCRIPT_READY: 'SCRIPT_READY',
  TTS_QUEUED: 'TTS_QUEUED',
  TTS_PROCESSING: 'TTS_PROCESSING',
  AUDIO_READY: 'AUDIO_READY',
  DELIVERED: 'DELIVERED',
  NEEDS_ATTENTION: 'NEEDS_ATTENTION',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
});

const EDITABLE = [STATUS.AWAITING_PERSONALIZATION, STATUS.SCRIPT_READY];
const MAX_DELIVERY_ATTEMPTS = 5;
const MAX_TTS_ATTEMPTS = 3;
const ON_PAID_TIMEOUT_MS = 8000;

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60_000);
}

function maskEmail(email) {
  const [user, domain] = String(email || '').split('@');
  if (!domain) return '';
  return `${user.slice(0, 1)}***@${domain}`;
}

async function logEvent(messageId, eventType, actor = 'system', details = null) {
  try {
    await query(
      'INSERT INTO santa_message_events (message_id, event_type, actor, details) VALUES (?, ?, ?, ?)',
      [messageId, eventType, actor, details ? JSON.stringify(details) : null],
    );
  } catch (error) {
    console.error('[santa] event log failed:', error.code || error.message);
  }
}

async function loadOrder(orderId) {
  const [rows] = await query(
    'SELECT id, status, customer_email, order_number, metadata FROM orders WHERE id = ? LIMIT 1',
    [orderId],
  );
  return rows[0] || null;
}

async function loadInstance(id) {
  const [rows] = await query('SELECT * FROM santa_message_instances WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

function scriptFrom(personalization) {
  const { value } = validatePersonalization(personalization);
  return value ? { personalization: value, script: buildSantaScript(value, { maxSeconds: santaConfig().maxAudioSeconds }) } : null;
}

/** Creates one instance per purchased unit. Safe to call any number of times. */
async function enqueueForPaidOrder(orderId, actor = 'system') {
  const config = santaConfig();
  if (!config.fulfillmentEnabled) return { created: 0, skipped: true };
  const order = await loadOrder(orderId);
  if (!order || order.status !== 'succeeded') return { created: 0 };
  const [items] = await query(
    'SELECT id, sku, quantity, metadata FROM order_items WHERE order_id = ? ORDER BY created_at, id',
    [orderId],
  );
  const voiceLines = items.filter((row) => isVoiceMessageSku(row.sku));
  if (!voiceLines.length) return { created: 0, hasVoice: false };
  let created = 0;
  for (const item of voiceLines) {
    const meta = parseJson(item.metadata);
    const mode = meta.voiceMode || (item.sku === VOICE_MESSAGE_ADDON_SKU ? 'letter_addon' : 'standalone');
    for (let index = 0; index < Number(item.quantity || 1); index += 1) {
      const draft = index === 0 && meta.voiceDraftId ? await loadDraftById(meta.voiceDraftId) : null;
      const prepared = draft ? scriptFrom(decryptJson(draft.personalization_enc)) : null;
      const status = !prepared
        ? STATUS.AWAITING_PERSONALIZATION
        : config.scriptApprovalRequired ? STATUS.SCRIPT_READY : STATUS.TTS_QUEUED;
      const id = randomUUID();
      const inserted = await withTransaction(async () => {
        const [result] = await query(
          `INSERT IGNORE INTO santa_message_instances
             (id, order_id, order_item_id, instance_index, sku, mode, status, draft_id,
              personalization_enc, script_enc, script_version, script_approved_at, paid_at,
              activation_token_hash, play_token_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?)`,
          [
            id, orderId, item.id, index, item.sku, mode, status, draft?.id || null,
            prepared ? encryptJson(prepared.personalization) : null,
            prepared ? encryptJson(prepared.script) : null,
            prepared ? prepared.script.version : null,
            status === STATUS.TTS_QUEUED ? new Date() : null,
            tokenHash(deriveToken('activate', id, 1)),
            tokenHash(deriveToken('play', id, 1)),
          ],
        );
        if (result.affectedRows !== 1) return false;
        const firstMail = status === STATUS.AWAITING_PERSONALIZATION ? 'activation'
          : status === STATUS.SCRIPT_READY ? 'approval' : 'order_received';
        await query(
          `INSERT IGNORE INTO santa_message_deliveries (id, message_id, delivery_type, version, status, next_attempt_at)
           VALUES (?, ?, ?, 1, 'pending', UTC_TIMESTAMP())`,
          [randomUUID(), id, firstMail],
        );
        return true;
      });
      if (!inserted) continue;
      created += 1;
      await logEvent(id, 'created', actor, { status, fromDraft: Boolean(prepared) });
      if (draft) await markDraftOrdered(draft.id, orderId);
    }
  }
  return { created, hasVoice: true };
}

function deliveryUrl(type, instance) {
  if (type === 'audio_ready') return playUrl(deriveToken('play', instance.id, instance.play_token_version));
  if (type === 'activation' || type === 'approval') {
    return activationUrl(deriveToken('activate', instance.id, instance.activation_token_version));
  }
  return null;
}

async function recordEmailSend(order, subject, status, errorMessage, actor) {
  try {
    const EmailSend = require('../../models/EmailSend');
    await EmailSend.createSend({
      type: 'santa_message', orderId: order.id, recipientEmail: order.customer_email, subject, status,
      errorMessage, triggeredBy: actor === 'admin' ? 'admin' : actor === 'cron' ? 'cron' : 'webhook',
    });
  } catch (error) {
    console.error('[santa] email_sends log failed:', error.code || error.message);
  }
}

/** Sends pending e-mails. Each row is claimed atomically, so parallel callers never double-send. */
async function processDeliveries({ messageId = null, orderId = null, actor = 'system', limit = 20 } = {}) {
  const filters = [];
  const params = [];
  if (messageId) { filters.push('d.message_id = ?'); params.push(messageId); }
  if (orderId) { filters.push('s.order_id = ?'); params.push(orderId); }
  const [rows] = await query(
    `SELECT d.id, d.message_id, d.delivery_type, d.attempts
     FROM santa_message_deliveries d JOIN santa_message_instances s ON s.id = d.message_id
     WHERE (d.status IN ('pending', 'failed') OR (d.status = 'sending' AND d.updated_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 MINUTE)))
       AND d.attempts < ${MAX_DELIVERY_ATTEMPTS}
       AND (d.next_attempt_at IS NULL OR d.next_attempt_at <= UTC_TIMESTAMP())
       ${filters.length ? `AND ${filters.join(' AND ')}` : ''}
     ORDER BY d.created_at LIMIT ${Math.max(1, Math.min(100, Number(limit) || 20))}`,
    params,
  );
  let sent = 0;
  for (const row of rows) {
    const [claim] = await query(
      `UPDATE santa_message_deliveries SET status = 'sending', attempts = attempts + 1
       WHERE id = ? AND attempts < ${MAX_DELIVERY_ATTEMPTS}
         AND (status IN ('pending', 'failed') OR (status = 'sending' AND updated_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 MINUTE)))`,
      [row.id],
    );
    if (claim.affectedRows !== 1) continue;
    const instance = await loadInstance(row.message_id);
    const order = instance ? await loadOrder(instance.order_id) : null;
    if (!instance || !order || order.status !== 'succeeded' || isExpired(instance) || [STATUS.CANCELLED, STATUS.EXPIRED].includes(instance.status)) {
      await query("UPDATE santa_message_deliveries SET status = 'failed', attempts = ?, last_error = 'not_deliverable' WHERE id = ?", [MAX_DELIVERY_ATTEMPTS, row.id]);
      continue;
    }
    if (row.delivery_type === 'audio_ready' && (!instance.audio_key || ![STATUS.AUDIO_READY, STATUS.DELIVERED].includes(instance.status))) {
      await query("UPDATE santa_message_deliveries SET status = 'failed', last_error = 'audio_missing', next_attempt_at = ? WHERE id = ?", [minutesFromNow(30), row.id]);
      continue;
    }
    try {
      const { subject } = await deliverSantaEmail({
        type: row.delivery_type,
        to: order.customer_email,
        url: deliveryUrl(row.delivery_type, instance),
        orderNumber: formatOrderNumber(order.order_number),
        consent: parseJson(order.metadata).digitalContentConsent,
      });
      await query("UPDATE santa_message_deliveries SET status = 'sent', sent_at = UTC_TIMESTAMP(), last_error = NULL WHERE id = ?", [row.id]);
      if (row.delivery_type === 'audio_ready') {
        const retention = new Date(Date.now() + santaConfig().audioRetentionDays * 86_400_000);
        await query(
          `UPDATE santa_message_instances SET status = ?, delivered_at = COALESCE(delivered_at, UTC_TIMESTAMP()),
             retention_until = COALESCE(retention_until, ?) WHERE id = ? AND status IN (?, ?)`,
          [STATUS.DELIVERED, retention, instance.id, STATUS.AUDIO_READY, STATUS.DELIVERED],
        );
      }
      await logEvent(instance.id, `email_${row.delivery_type}_sent`, actor);
      await recordEmailSend(order, subject, 'sent', null, actor);
      sent += 1;
    } catch (error) {
      const message = String(error.message || 'send_failed').slice(0, 250);
      await query(
        "UPDATE santa_message_deliveries SET status = 'failed', last_error = ?, next_attempt_at = ? WHERE id = ?",
        [message, minutesFromNow(5 * 2 ** Math.min(4, Number(row.attempts || 0))), row.id],
      );
      await logEvent(instance.id, `email_${row.delivery_type}_failed`, actor);
      await recordEmailSend(order, row.delivery_type, 'failed', message, actor);
      console.error(`[santa] e-mail ${row.delivery_type} failed for message ${instance.id}: ${message}`);
    }
  }
  return { sent };
}

async function addDelivery(messageId, type) {
  const [rows] = await query(
    'SELECT COALESCE(MAX(version), 0) AS v FROM santa_message_deliveries WHERE message_id = ? AND delivery_type = ?',
    [messageId, type],
  );
  await query(
    `INSERT IGNORE INTO santa_message_deliveries (id, message_id, delivery_type, version, status, next_attempt_at)
     VALUES (?, ?, ?, ?, 'pending', UTC_TIMESTAMP())`,
    [randomUUID(), messageId, type, Number(rows[0]?.v || 0) + 1],
  );
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((resolve) => { timer = setTimeout(() => resolve({ timedOut: true }), ms); timer.unref?.(); }),
  ]).finally(() => clearTimeout(timer));
}

const recentlyHandled = new Map();

/**
 * Post-payment hook for the webhook, free orders and the payment status endpoint.
 * Never throws and never delays the existing pipeline beyond a short timeout.
 */
async function onOrderPaid(orderId, actor = 'webhook') {
  if (!orderId) return { skipped: true };
  const last = recentlyHandled.get(orderId);
  if (last && Date.now() - last < 60_000) return { skipped: true };
  try {
    const result = await withTimeout((async () => {
      const { created, hasVoice } = await enqueueForPaidOrder(orderId, actor);
      if (!hasVoice) return { created: 0 };
      await processDeliveries({ orderId, actor });
      if (created) kickTtsQueue();
      return { created };
    })(), ON_PAID_TIMEOUT_MS);
    if (!result.timedOut) {
      recentlyHandled.set(orderId, Date.now());
      if (recentlyHandled.size > 500) recentlyHandled.delete(recentlyHandled.keys().next().value);
    }
    return result;
  } catch (error) {
    console.error(`[santa] post-payment fulfillment failed for order ${orderId}:`, error.code || error.message);
    return { error: true };
  }
}

function orderHasVoiceItems(items) {
  return Array.isArray(items) && items.some((item) => isVoiceMessageSku(item?.sku));
}

/* ---------- customer: activation link ---------- */

async function findByToken(kind, token) {
  const column = kind === 'play' ? 'play_token_hash' : 'activation_token_hash';
  const [rows] = await query(`SELECT * FROM santa_message_instances WHERE ${column} = ? LIMIT 1`, [tokenHash(token)]);
  return rows[0] || null;
}

async function activationView(instance) {
  const order = await loadOrder(instance.order_id);
  const config = santaConfig();
  const script = decryptJson(instance.script_enc);
  const editable = EDITABLE.includes(instance.status) && instance.submit_count < config.maxSubmits;
  return {
    status: instance.status,
    mode: instance.mode,
    email: maskEmail(order?.customer_email),
    orderNumber: formatOrderNumber(order?.order_number),
    personalization: decryptJson(instance.personalization_enc),
    script: script ? { text: script.spokenText, estimatedSeconds: script.estimatedSeconds } : null,
    canEdit: editable,
    canApprove: instance.status === STATUS.SCRIPT_READY,
    approvalRequired: config.scriptApprovalRequired,
    remainingEdits: Math.max(0, config.maxSubmits - instance.submit_count),
  };
}

async function submitPersonalization(instance, input) {
  const config = santaConfig();
  if (!EDITABLE.includes(instance.status)) return { conflict: 'NOT_EDITABLE' };
  if (instance.submit_count >= config.maxSubmits) return { conflict: 'EDIT_LIMIT' };
  const { value, errors } = validatePersonalization(input);
  if (!value) return { errors };
  const script = buildSantaScript(value, { maxSeconds: config.maxAudioSeconds });
  if (script.estimatedSeconds > config.maxAudioSeconds) {
    return { errors: [{ field: 'script', code: 'TOO_LONG', max: config.maxAudioSeconds }] };
  }
  const next = config.scriptApprovalRequired ? STATUS.SCRIPT_READY : STATUS.TTS_QUEUED;
  const [result] = await query(
    `UPDATE santa_message_instances
     SET personalization_enc = ?, script_enc = ?, script_version = ?, status = ?, submit_count = submit_count + 1,
         script_approved_at = ?
     WHERE id = ? AND status IN (?, ?) AND submit_count < ?`,
    [encryptJson(value), encryptJson(script), script.version, next,
      next === STATUS.TTS_QUEUED ? new Date() : null,
      instance.id, ...EDITABLE, config.maxSubmits],
  );
  if (result.affectedRows !== 1) return { conflict: 'NOT_EDITABLE' };
  await logEvent(instance.id, 'personalization_submitted', 'customer', { status: next });
  if (next === STATUS.TTS_QUEUED) await runTtsWithinRequest();
  return { ok: true };
}

async function approveScript(instance) {
  const [result] = await query(
    `UPDATE santa_message_instances SET status = ?, script_approved_at = UTC_TIMESTAMP()
     WHERE id = ? AND status = ?`,
    [STATUS.TTS_QUEUED, instance.id, STATUS.SCRIPT_READY],
  );
  if (result.affectedRows !== 1) return { conflict: 'NOT_APPROVABLE' };
  await logEvent(instance.id, 'script_approved', 'customer');
  await runTtsWithinRequest();
  return { ok: true };
}

/* ---------- TTS ---------- */

let ttsRunning = false;

/** Serverless functions may freeze after the response, so synthesis runs inside the request (bounded). */
async function runTtsWithinRequest() {
  if (!ttsConfigured()) return;
  try {
    await withTimeout(processTtsQueue({ limit: 1 }), 45_000);
  } catch (error) {
    console.error('[santa] TTS failed:', error.code || error.message);
  }
}

function kickTtsQueue() {
  if (!ttsConfigured() || ttsRunning) return;
  processTtsQueue().catch((error) => console.error('[santa] TTS queue failed:', error.code || error.message));
}

async function processTtsQueue({ limit = 3 } = {}) {
  if (!ttsConfigured()) return { processed: 0, disabled: true };
  if (ttsRunning) return { processed: 0, busy: true };
  ttsRunning = true;
  let processed = 0;
  try {
    const [rows] = await query(
      `SELECT id FROM santa_message_instances
       WHERE status = ? AND (tts_next_attempt_at IS NULL OR tts_next_attempt_at <= UTC_TIMESTAMP())
       ORDER BY updated_at LIMIT ${Math.max(1, Math.min(10, limit))}`,
      [STATUS.TTS_QUEUED],
    );
    for (const { id } of rows) {
      const [claim] = await query(
        'UPDATE santa_message_instances SET status = ?, tts_attempts = tts_attempts + 1 WHERE id = ? AND status = ?',
        [STATUS.TTS_PROCESSING, id, STATUS.TTS_QUEUED],
      );
      if (claim.affectedRows !== 1) continue;
      const instance = await loadInstance(id);
      try {
        const script = decryptJson(instance.script_enc);
        const { synthesize } = require('./tts');
        const audio = await synthesize(script.spokenText);
        await storeAudio(instance, audio, 'tts', 'system');
        processed += 1;
      } catch (error) {
        const attempts = Number(instance.tts_attempts || 0);
        const retry = error.retryable !== false && attempts < MAX_TTS_ATTEMPTS;
        await query(
          'UPDATE santa_message_instances SET status = ?, last_error_code = ?, tts_next_attempt_at = ? WHERE id = ?',
          [retry ? STATUS.TTS_QUEUED : STATUS.NEEDS_ATTENTION, String(error.code || 'TTS_FAILED').slice(0, 80), minutesFromNow(5 * attempts), id],
        );
        await logEvent(id, retry ? 'tts_retry_scheduled' : 'tts_failed', 'system', { code: error.code || 'TTS_FAILED' });
      }
    }
  } finally {
    ttsRunning = false;
  }
  return { processed };
}

/** Validates and stores an MP3, then moves the message to AUDIO_READY (and delivers when review is off). */
async function storeAudio(instance, buffer, source, actor) {
  const info = mp3Info(buffer);
  if (!info) throw Object.assign(new Error('Plik nie jest poprawnym MP3.'), { code: 'AUDIO_INVALID', retryable: false, status: 400 });
  const limit = santaConfig().maxAudioSeconds + 15;
  if (info.durationSeconds > limit) {
    throw Object.assign(new Error(`Nagranie jest za długie (${info.durationSeconds}s, limit ${limit}s).`), { code: 'AUDIO_TOO_LONG', retryable: false, status: 400 });
  }
  const key = await saveAudio(instance.id, buffer);
  const delivered = instance.status === STATUS.DELIVERED;
  let stored;
  try {
    [stored] = await query(
    `UPDATE santa_message_instances
     SET audio_key = ?, audio_duration_seconds = ?, audio_bytes = ?, audio_source = ?, status = ?,
         audio_ready_at = UTC_TIMESTAMP(), last_error_code = NULL
     WHERE id = ? AND status = ? AND audio_key <=> ?`,
    [key, info.durationSeconds, buffer.length, source, delivered ? STATUS.DELIVERED : STATUS.AUDIO_READY, instance.id, instance.status, instance.audio_key || null],
    );
  } catch (error) {
    await deleteAudio(key).catch(() => {});
    throw error;
  }
  if (stored.affectedRows !== 1) {
    await deleteAudio(key);
    return { conflict: 'NOT_READY' };
  }
  if (instance.audio_key && instance.audio_key !== key) {
    deleteAudio(instance.audio_key).catch(() => {});
  }
  await logEvent(instance.id, 'audio_stored', actor, { source, durationSeconds: info.durationSeconds });
  if (!delivered && !santaConfig().adminReviewRequired) await deliverAudio(instance.id, actor);
  return { durationSeconds: info.durationSeconds };
}

async function deliverAudio(messageId, actor = 'admin') {
  const instance = await loadInstance(messageId);
  if (!instance?.audio_key) return { conflict: 'AUDIO_MISSING' };
  if (![STATUS.AUDIO_READY, STATUS.DELIVERED].includes(instance.status)) return { conflict: 'NOT_READY' };
  await addDelivery(messageId, 'audio_ready');
  await logEvent(messageId, 'delivery_requested', actor);
  const result = await processDeliveries({ messageId, actor });
  return { ok: true, queued: result.sent === 0 };
}

/* ---------- playback ---------- */

function signedAudioPath(messageId, download = false, version = 1) {
  const exp = Math.floor(Date.now() / 1000) + santaConfig().signedUrlTtlSeconds;
  const sig = audioSignature(messageId, exp, download, version);
  return `/santa-messages/audio/${messageId}?exp=${exp}&sig=${sig}&v=${version}${download ? '&dl=1' : ''}`;
}

function isExpired(instance) {
  return Boolean(instance.retention_until && new Date(instance.retention_until).getTime() <= Date.now());
}

async function playbackView(instance) {
  const personalization = decryptJson(instance.personalization_enc) || {};
  const script = decryptJson(instance.script_enc);
  if (!instance.first_played_at) {
    await query('UPDATE santa_message_instances SET first_played_at = UTC_TIMESTAMP() WHERE id = ? AND first_played_at IS NULL', [instance.id]);
  }
  return {
    childVocative: personalization.childVocative || '',
    childName: personalization.childName || '',
    durationSeconds: instance.audio_duration_seconds != null ? Number(instance.audio_duration_seconds) : null,
    audioUrl: signedAudioPath(instance.id, false, Number(instance.play_token_version) || 1),
    downloadUrl: signedAudioPath(instance.id, true, Number(instance.play_token_version) || 1),
    transcript: script?.spokenText || '',
    availableUntil: instance.retention_until,
  };
}

async function audioForStreaming(messageId, version) {
  const instance = await loadInstance(messageId);
  if (!instance || instance.status !== STATUS.DELIVERED || !instance.audio_key || isExpired(instance)
      || Number(instance.play_token_version) !== version) return null;
  const order = await loadOrder(instance.order_id);
  if (order?.status !== 'succeeded') return null;
  return readAudio(instance.audio_key);
}

/* ---------- admin ---------- */

async function listInstances({ status, q, limit = 50, offset = 0 } = {}) {
  const filters = [];
  const params = [];
  if (status) { filters.push('s.status = ?'); params.push(status); }
  if (q) {
    filters.push('(o.customer_email LIKE ? OR CAST(o.order_number AS CHAR) = ? OR s.order_id = ?)');
    const digits = String(q).replace(/\D/g, '');
    params.push(`%${q}%`, digits ? String(parseInt(digits, 10)) : '-', q);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const [rows] = await query(
    `SELECT s.id, s.order_id, s.sku, s.mode, s.status, s.audio_duration_seconds, s.audio_source, s.last_error_code,
            s.created_at, s.updated_at, s.delivered_at, s.paid_at, o.order_number, o.customer_email
     FROM santa_message_instances s JOIN orders o ON o.id = s.order_id
     ${where} ORDER BY s.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params,
  );
  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM santa_message_instances s JOIN orders o ON o.id = s.order_id ${where}`,
    params,
  );
  const [statusRows] = await query('SELECT status, COUNT(*) AS n FROM santa_message_instances GROUP BY status');
  return {
      storage: storageInfo(),
    items: rows.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      orderNumber: formatOrderNumber(row.order_number),
      customerEmail: row.customer_email,
      sku: row.sku,
      mode: row.mode,
      status: row.status,
      durationSeconds: row.audio_duration_seconds != null ? Number(row.audio_duration_seconds) : null,
      audioSource: row.audio_source,
      lastErrorCode: row.last_error_code,
      createdAt: row.created_at,
      paidAt: row.paid_at,
      deliveredAt: row.delivered_at,
    })),
    total: Number(countRows[0]?.total || 0),
    counts: Object.fromEntries(statusRows.map((row) => [row.status, Number(row.n)])),
  };
}

async function instanceDetail(id) {
  const instance = await loadInstance(id);
  if (!instance) return null;
  const order = await loadOrder(instance.order_id);
  const script = decryptJson(instance.script_enc);
  const [events] = await query(
    'SELECT event_type, actor, details, created_at FROM santa_message_events WHERE message_id = ? ORDER BY id DESC LIMIT 50',
    [id],
  );
  const [deliveries] = await query(
    `SELECT delivery_type, version, status, attempts, last_error, sent_at, created_at
     FROM santa_message_deliveries WHERE message_id = ? ORDER BY created_at DESC`,
    [id],
  );
  return {
    id: instance.id,
    orderId: instance.order_id,
    orderNumber: formatOrderNumber(order?.order_number),
    customerEmail: order?.customer_email || '',
    orderStatus: order?.status || null,
    sku: instance.sku,
    mode: instance.mode,
    status: instance.status,
    personalization: decryptJson(instance.personalization_enc),
    script: script ? { text: script.spokenText, estimatedSeconds: script.estimatedSeconds, wordCount: script.wordCount } : null,
    scriptVersion: instance.script_version,
    submitCount: instance.submit_count,
    hasAudio: Boolean(instance.audio_key),
    audio: instance.audio_key ? {
      durationSeconds: instance.audio_duration_seconds != null ? Number(instance.audio_duration_seconds) : null,
      bytes: instance.audio_bytes,
      source: instance.audio_source,
    } : null,
    ttsAutomation: ttsConfigured(),
    storage: storageInfo(),
    lastErrorCode: instance.last_error_code,
    timestamps: {
      paidAt: instance.paid_at,
      approvedAt: instance.script_approved_at,
      audioReadyAt: instance.audio_ready_at,
      deliveredAt: instance.delivered_at,
      firstPlayedAt: instance.first_played_at,
      retentionUntil: instance.retention_until,
    },
    events: events.map((e) => ({ type: e.event_type, actor: e.actor, details: parseJson(e.details), at: e.created_at })),
    deliveries: deliveries.map((d) => ({
      type: d.delivery_type, version: d.version, status: d.status, attempts: d.attempts,
      lastError: d.last_error, sentAt: d.sent_at, createdAt: d.created_at,
    })),
  };
}

async function audioUploadTarget(id) {
  const instance = await loadInstance(id);
  if (!instance) return { notFound: true };
  if ([STATUS.CANCELLED, STATUS.EXPIRED, STATUS.DELIVERED, STATUS.TTS_PROCESSING].includes(instance.status)) return { conflict: 'CLOSED' };
  if (!instance.script_enc) return { conflict: 'NO_SCRIPT' };
  if (santaConfig().scriptApprovalRequired && !instance.script_approved_at) return { conflict: 'NOT_APPROVED' };
  const order = await loadOrder(instance.order_id);
  if (order?.status !== 'succeeded') return { conflict: 'NOT_PAID' };
  return { instance };
}

async function adminUploadAudio(id, buffer) {
  const target = await audioUploadTarget(id);
  if (!target.instance) return target;
  const instance = target.instance;
  return storeAudio(instance, buffer, 'upload', 'admin');
}

async function adminAttachR2Audio(id, objectKey) {
  const target = await audioUploadTarget(id);
  if (!target.instance) return target;
  if (storageInfo().provider !== 'r2') throw Object.assign(new Error('Ustaw SANTA_AUDIO_STORAGE=r2 w środowisku API.'), { status: 400, code: 'R2_NOT_SELECTED' });
  const buffer = await readR2Audio(objectKey);
  if (!buffer) throw Object.assign(new Error('Nie znaleziono pliku w skonfigurowanym buckecie R2. Sprawdź klucz obiektu.'), { status: 400, code: 'R2_NOT_FOUND' });
  // Keep an owned, validated snapshot. Later replacement or deletion of the source
  // object cannot silently change a child's delivered message.
  return storeAudio(target.instance, buffer, 'r2', 'admin');
}

async function adminUpdateScript(id, text) {
  const instance = await loadInstance(id);
  if (!instance) return { notFound: true };
  if (![STATUS.SCRIPT_READY, STATUS.TTS_QUEUED, STATUS.NEEDS_ATTENTION].includes(instance.status)) return { conflict: 'NOT_EDITABLE' };
  const spokenText = String(text || '').replace(/\r\n/g, '\n').trim();
  const wordCount = countWords(spokenText);
  const estimatedSeconds = Math.round(wordCount / WORDS_PER_SECOND);
  if (wordCount < 20 || spokenText.length > 3000 || /[<>]/.test(spokenText)) return { errors: [{ field: 'script', code: 'INVALID' }] };
  if (estimatedSeconds > santaConfig().maxAudioSeconds) return { errors: [{ field: 'script', code: 'TOO_LONG' }] };
  const previous = decryptJson(instance.script_enc) || {};
  const script = { ...previous, spokenText, wordCount, estimatedSeconds, version: 'admin-edit' };
  await query('UPDATE santa_message_instances SET script_enc = ?, script_version = ? WHERE id = ?', [encryptJson(script), script.version, id]);
  await logEvent(id, 'script_edited', 'admin', { wordCount });
  return { ok: true };
}

async function adminRetryTts(id) {
  const [result] = await query(
    'UPDATE santa_message_instances SET status = ?, tts_next_attempt_at = NULL, tts_attempts = 0, last_error_code = NULL WHERE id = ? AND status IN (?, ?)',
    [STATUS.TTS_QUEUED, id, STATUS.NEEDS_ATTENTION, STATUS.TTS_PROCESSING],
  );
  if (result.affectedRows !== 1) return { conflict: 'NOT_RETRYABLE' };
  await logEvent(id, 'tts_retry_requested', 'admin');
  await runTtsWithinRequest();
  return { ok: true };
}

async function adminResendLink(id) {
  const instance = await loadInstance(id);
  if (!instance) return { notFound: true };
  const type = instance.status === STATUS.DELIVERED ? 'audio_ready'
    : instance.status === STATUS.AWAITING_PERSONALIZATION ? 'activation'
      : instance.status === STATUS.SCRIPT_READY ? 'approval' : null;
  if (!type) return { conflict: 'NOTHING_TO_RESEND' };
  await addDelivery(id, type);
  await logEvent(id, 'resend_requested', 'admin', { type });
  const result = await processDeliveries({ messageId: id, actor: 'admin' });
  return { ok: true, type, queued: result.sent === 0 };
}

async function adminRevokePlayLink(id) {
  const instance = await loadInstance(id);
  if (!instance) return { notFound: true };
  const version = Number(instance.play_token_version) + 1;
  await query(
    'UPDATE santa_message_instances SET play_token_version = ?, play_token_hash = ? WHERE id = ?',
    [version, tokenHash(deriveToken('play', id, version)), id],
  );
  await logEvent(id, 'play_link_revoked', 'admin', { version });
  if (instance.status === STATUS.DELIVERED) return adminResendLink(id);
  return { ok: true };
}

async function adminCancel(id) {
  const instance = await loadInstance(id);
  if (!instance) return { notFound: true };
  await query('UPDATE santa_message_instances SET status = ? WHERE id = ?', [STATUS.CANCELLED, id]);
  if (instance.audio_key) {
    // Leave the key for the cleanup job when storage is temporarily unavailable.
    try {
      await deleteAudio(instance.audio_key);
      await query('UPDATE santa_message_instances SET audio_key = NULL, personalization_enc = NULL, script_enc = NULL WHERE id = ?', [id]);
    } catch (error) {
      await logEvent(id, 'audio_cleanup_pending', 'admin', { code: error.code || 'STORAGE_ERROR' });
    }
  }
  await logEvent(id, 'cancelled', 'admin');
  return { ok: true };
}

async function adminAudio(id) {
  const instance = await loadInstance(id);
  if (!instance?.audio_key) return null;
  return readAudio(instance.audio_key);
}

/* ---------- cron ---------- */

async function sweepPaidOrders() {
  const [rows] = await query(
    `SELECT DISTINCT o.id FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN santa_message_instances s ON s.order_item_id = oi.id
     WHERE o.status = 'succeeded' AND oi.sku IN (?, ?) AND s.id IS NULL
       AND o.created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 DAY)
     LIMIT 50`,
    [VOICE_MESSAGE_SKU, VOICE_MESSAGE_ADDON_SKU],
  );
  let created = 0;
  for (const { id } of rows) created += (await enqueueForPaidOrder(id, 'cron')).created;
  return created;
}

async function expireRetainedAudio() {
  const [rows] = await query(
    `SELECT id, audio_key FROM santa_message_instances
     WHERE (status = ? AND retention_until IS NOT NULL AND retention_until < UTC_TIMESTAMP())
       OR (status IN (?, ?) AND audio_key IS NOT NULL) LIMIT 50`,
    [STATUS.DELIVERED, STATUS.EXPIRED, STATUS.CANCELLED],
  );
  let cleaned = 0;
  for (const row of rows) {
    try {
      await deleteAudio(row.audio_key);
      await query(
        'UPDATE santa_message_instances SET status = IF(status = ?, status, ?), audio_key = NULL, personalization_enc = NULL, script_enc = NULL WHERE id = ?',
        [STATUS.CANCELLED, STATUS.EXPIRED, row.id],
      );
      await logEvent(row.id, 'audio_removed', 'cron');
      cleaned += 1;
    } catch (error) {
      await logEvent(row.id, 'audio_cleanup_pending', 'cron', { code: error.code || 'STORAGE_ERROR' });
    }
  }
  return cleaned;
}

async function runSantaCron() {
  const { purgeExpiredDrafts } = require('./drafts');
  const summary = {};
  const steps = {
    created: sweepPaidOrders,
    requeued: async () => {
      const [r] = await query(
        `UPDATE santa_message_instances SET status = ? WHERE status = ? AND updated_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE)`,
        [STATUS.TTS_QUEUED, STATUS.TTS_PROCESSING],
      );
      return r.affectedRows || 0;
    },
    tts: async () => (await processTtsQueue({ limit: 5 })).processed || 0,
    emails: async () => (await processDeliveries({ actor: 'cron', limit: 50 })).sent,
    expired: expireRetainedAudio,
    draftsPurged: purgeExpiredDrafts,
  };
  for (const [name, step] of Object.entries(steps)) {
    try {
      summary[name] = await step();
    } catch (error) {
      summary[name] = `error:${error.code || 'failed'}`;
      console.error(`[santa] cron step ${name} failed:`, error.code || error.message);
    }
  }
  return summary;
}

module.exports = {
  STATUS,
  maskEmail,
  enqueueForPaidOrder,
  processDeliveries,
  onOrderPaid,
  orderHasVoiceItems,
  findByToken,
  activationView,
  submitPersonalization,
  approveScript,
  processTtsQueue,
  storeAudio,
  deliverAudio,
  playbackView,
  audioForStreaming,
  isExpired,
  listInstances,
  instanceDetail,
  adminUploadAudio,
  adminAttachR2Audio,
  adminUpdateScript,
  adminRetryTts,
  adminResendLink,
  adminRevokePlayLink,
  adminCancel,
  adminAudio,
  runSantaCron,
};

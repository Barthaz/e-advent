'use strict';

const { randomUUID } = require('node:crypto');
const { query } = require('../../config/database');
const { santaConfig } = require('./config');
const { sha256, newDraftKey, encryptJson, decryptJson } = require('./crypto');
const { validatePersonalization } = require('./validation');
const { buildSantaScript } = require('./script');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODES = ['standalone', 'letter_addon'];

function draftExpiry() {
  return new Date(Date.now() + santaConfig().draftTtlDays * 86_400_000);
}

function keyHash(key) {
  return sha256(`santa-draft:${key}`);
}

function draftView(row) {
  const personalization = decryptJson(row.personalization_enc);
  const script = decryptJson(row.script_enc);
  return {
    id: row.id,
    mode: row.mode,
    status: row.status,
    personalization,
    preview: script ? { text: script.spokenText, estimatedSeconds: script.estimatedSeconds } : null,
    expiresAt: row.expires_at,
  };
}

function prepare(input) {
  const { value, errors } = validatePersonalization(input);
  if (!value) return { errors };
  const { maxAudioSeconds } = santaConfig();
  const script = buildSantaScript(value, { maxSeconds: maxAudioSeconds });
  if (script.estimatedSeconds > maxAudioSeconds) {
    return { errors: [{ field: 'script', code: 'TOO_LONG', max: maxAudioSeconds }] };
  }
  return { value, script };
}

async function createDraft({ mode, personalization }) {
  if (!MODES.includes(mode)) return { errors: [{ field: 'mode', code: 'INVALID_OPTION' }] };
  const prepared = prepare(personalization);
  if (prepared.errors) return prepared;
  const id = randomUUID();
  const key = newDraftKey();
  await query(
    `INSERT INTO santa_message_drafts (id, draft_key_hash, mode, personalization_enc, script_enc, status, expires_at)
     VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
    [id, keyHash(key), mode, encryptJson(prepared.value), encryptJson(prepared.script), draftExpiry()],
  );
  return { draft: { id, key, mode, preview: { text: prepared.script.spokenText, estimatedSeconds: prepared.script.estimatedSeconds } } };
}

/** @returns {Promise<object|null>} raw row when id + key match and the draft is alive */
async function loadDraftRow(id, key) {
  if (!UUID.test(String(id || '')) || typeof key !== 'string' || key.length < 20 || key.length > 100) return null;
  const [rows] = await query(
    `SELECT * FROM santa_message_drafts WHERE id = ? AND draft_key_hash = ? AND expires_at > UTC_TIMESTAMP() LIMIT 1`,
    [id, keyHash(key)],
  );
  return rows[0] || null;
}

async function getDraft(id, key) {
  const row = await loadDraftRow(id, key);
  return row ? draftView(row) : null;
}

async function updateDraft(id, key, { mode, personalization }) {
  const row = await loadDraftRow(id, key);
  if (!row) return { notFound: true };
  if (row.status !== 'draft') return { locked: true };
  const nextMode = MODES.includes(mode) ? mode : row.mode;
  const prepared = prepare(personalization);
  if (prepared.errors) return prepared;
  await query(
    `UPDATE santa_message_drafts SET mode = ?, personalization_enc = ?, script_enc = ?,
       expires_at = ? WHERE id = ? AND status = 'draft'`,
    [nextMode, encryptJson(prepared.value), encryptJson(prepared.script), draftExpiry(), id],
  );
  return { draft: { id, mode: nextMode, preview: { text: prepared.script.spokenText, estimatedSeconds: prepared.script.estimatedSeconds } } };
}

/** Draft by id only — used after payment, when the order already proved ownership at checkout. */
async function loadDraftById(id) {
  if (!UUID.test(String(id || ''))) return null;
  const [rows] = await query('SELECT * FROM santa_message_drafts WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function markDraftOrdered(id, orderId) {
  await query(
    `UPDATE santa_message_drafts SET status = 'ordered', order_id = ? WHERE id = ? AND status = 'draft'`,
    [orderId, id],
  );
}

async function purgeExpiredDrafts() {
  const [result] = await query(
    `DELETE FROM santa_message_drafts WHERE status = 'draft' AND expires_at < UTC_TIMESTAMP() LIMIT 500`,
  );
  // Ordered drafts are redundant once every message has its own encrypted copy.
  await query(`UPDATE santa_message_drafts d SET d.personalization_enc = NULL, d.script_enc = NULL
    WHERE d.status = 'ordered' AND d.personalization_enc IS NOT NULL
      AND EXISTS (SELECT 1 FROM santa_message_instances s WHERE s.order_id = d.order_id)
      AND NOT EXISTS (SELECT 1 FROM santa_message_instances s WHERE s.order_id = d.order_id AND s.status NOT IN ('EXPIRED', 'CANCELLED'))`);
  return result?.affectedRows || 0;
}

module.exports = {
  createDraft,
  getDraft,
  updateDraft,
  loadDraftRow,
  loadDraftById,
  markDraftOrdered,
  purgeExpiredDrafts,
  MODES,
  UUID,
};

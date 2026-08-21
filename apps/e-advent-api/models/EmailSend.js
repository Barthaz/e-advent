const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const VALID_TYPES = new Set([
  'order_confirmation',
  'interactive_access',
  'shipping',
  'daily_window',
  'collaboration_invite',
]);

const VALID_STATUSES = new Set(['sent', 'failed']);
const VALID_TRIGGERS = new Set(['webhook', 'admin', 'cron', 'system']);

function rowToSend(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    orderId: row.order_id || null,
    calendarId: row.calendar_id || null,
    day: row.day != null ? Number(row.day) : null,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    status: row.status,
    errorMessage: row.error_message || null,
    triggeredBy: row.triggered_by,
    createdAt: row.created_at,
  };
}

async function createSend(data) {
  const id = uuidv4();
  const type = VALID_TYPES.has(data.type) ? data.type : 'order_confirmation';
  const status = VALID_STATUSES.has(data.status) ? data.status : 'sent';
  const triggeredBy = VALID_TRIGGERS.has(data.triggeredBy) ? data.triggeredBy : 'system';

  await query(
    `INSERT INTO email_sends
       (id, type, order_id, calendar_id, day, recipient_email, subject, status, error_message, triggered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      type,
      data.orderId || null,
      data.calendarId || null,
      data.day != null ? Number(data.day) : null,
      String(data.recipientEmail || '').trim().toLowerCase(),
      data.subject || '',
      status,
      data.errorMessage || null,
      triggeredBy,
    ]
  );

  const [rows] = await query('SELECT * FROM email_sends WHERE id = ?', [id]);
  return rowToSend(rows[0]);
}

async function listByOrderId(orderId, options = {}) {
  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 50));
  const [rows] = await query(
    `SELECT * FROM email_sends
     WHERE order_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [String(orderId), limit]
  );
  return rows.map(rowToSend);
}

async function listByCalendarId(calendarId, options = {}) {
  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 50));
  const [rows] = await query(
    `SELECT * FROM email_sends
     WHERE calendar_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [String(calendarId), limit]
  );
  return rows.map(rowToSend);
}

async function hasSuccessfulDaily(calendarId, day) {
  const [rows] = await query(
    `SELECT id FROM email_sends
     WHERE calendar_id = ?
       AND type = 'daily_window'
       AND day = ?
       AND status = 'sent'
     LIMIT 1`,
    [String(calendarId), Number(day)]
  );
  return rows.length > 0;
}

async function countSuccessfulDaily(day, calendarIds) {
  if (!Array.isArray(calendarIds) || calendarIds.length === 0) return 0;
  const placeholders = calendarIds.map(() => '?').join(',');
  const [rows] = await query(
    `SELECT COUNT(DISTINCT calendar_id) AS cnt
     FROM email_sends
     WHERE type = 'daily_window'
       AND day = ?
       AND status = 'sent'
       AND calendar_id IN (${placeholders})`,
    [Number(day), ...calendarIds]
  );
  return Number(rows[0]?.cnt || 0);
}

module.exports = {
  createSend,
  listByOrderId,
  listByCalendarId,
  hasSuccessfulDaily,
  countSuccessfulDaily,
};

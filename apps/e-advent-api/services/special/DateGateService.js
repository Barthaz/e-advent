'use strict';

const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');

async function sealContent(calendarId, taskId, revealAt, payload) {
  const id = uuidv4();
  const now = new Date();
  await query(
    `INSERT INTO date_gate_entries (id, calendar_id, task_id, reveal_at, sealed_payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE sealed_payload = VALUES(sealed_payload), reveal_at = VALUES(reveal_at)`,
    [calendarId, taskId, revealAt, JSON.stringify(payload), now],
  );
  return { sealed: true, revealAt };
}

async function getSealedContent(calendarId, taskId) {
  const [rows] = await query(
    'SELECT * FROM date_gate_entries WHERE calendar_id = ? AND task_id = ? LIMIT 1',
    [calendarId, taskId],
  );
  const row = rows[0];
  if (!row) return { revealed: true, payload: null };

  const now = new Date();
  const revealAt = new Date(row.reveal_at);
  if (now >= revealAt || row.revealed_at) {
    return {
      revealed: true,
      payload: typeof row.sealed_payload === 'string'
        ? JSON.parse(row.sealed_payload)
        : row.sealed_payload,
    };
  }

  return { revealed: false, payload: null };
}

module.exports = { sealContent, getSealedContent };

'use strict';

const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');

function nextChristmasEve18(from = new Date()) {
  const year = from.getFullYear();
  let target = new Date(year, 11, 24, 18, 0, 0, 0);
  if (from >= target) {
    target = new Date(year + 1, 11, 24, 18, 0, 0, 0);
  }
  return target;
}

/**
 * Resolve a reveal timestamp from pack/body hints.
 * - ISO date string → that instant
 * - 'next-christmas' | 'christmas-eve' → next Dec 24 18:00 local
 * - number (or numeric string) → now + N days
 * - otherwise → now + 7 days
 */
function resolveRevealAt(raw) {
  const now = new Date();
  if (raw == null || raw === '') {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  if (typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(String(raw).trim()))) {
    const days = Number(raw);
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }
  if (raw === 'next-christmas' || raw === 'christmas-eve') {
    return nextChristmasEve18(now);
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
}

async function sealContent(calendarId, taskId, revealAt, payload) {
  const id = uuidv4();
  const now = new Date();
  const reveal = revealAt instanceof Date ? revealAt : new Date(revealAt);
  await query(
    `INSERT INTO date_gate_entries (id, calendar_id, task_id, reveal_at, sealed_payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE sealed_payload = VALUES(sealed_payload), reveal_at = VALUES(reveal_at)`,
    [id, calendarId, taskId, reveal, JSON.stringify(payload), now],
  );
  return { sealed: true, revealAt: reveal.toISOString() };
}

async function getSealedContent(calendarId, taskId) {
  const [rows] = await query(
    'SELECT * FROM date_gate_entries WHERE calendar_id = ? AND task_id = ? LIMIT 1',
    [calendarId, taskId],
  );
  const row = rows[0];
  if (!row) return { revealed: true, sealed: false, payload: null, revealAt: null };

  const now = new Date();
  const revealAt = new Date(row.reveal_at);
  const revealAtIso = revealAt.toISOString();
  if (now >= revealAt || row.revealed_at) {
    return {
      revealed: true,
      sealed: true,
      revealAt: revealAtIso,
      payload: typeof row.sealed_payload === 'string'
        ? JSON.parse(row.sealed_payload)
        : row.sealed_payload,
    };
  }

  return { revealed: false, sealed: true, revealAt: revealAtIso, payload: null };
}

async function markRevealed(calendarId, taskId) {
  const now = new Date();
  await query(
    `UPDATE date_gate_entries SET revealed_at = ? WHERE calendar_id = ? AND task_id = ?`,
    [now, calendarId, taskId],
  );
  return { revealed: true, revealedAt: now.toISOString() };
}

module.exports = {
  sealContent,
  getSealedContent,
  markRevealed,
  resolveRevealAt,
};

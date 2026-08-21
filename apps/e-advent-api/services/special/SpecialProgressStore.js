'use strict';

const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');

function rowToProgress(row) {
  if (!row) return null;
  return {
    taskId: row.task_id,
    configId: row.payload?.configId || row.task_id,
    status: row.status,
    payloadVersion: row.payload_version,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function getProgress(calendarId, taskId) {
  try {
    const [rows] = await query(
      'SELECT * FROM special_window_progress WHERE calendar_id = ? AND task_id = ? LIMIT 1',
      [calendarId, taskId],
    );
    return rowToProgress(rows[0]);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return null;
    throw error;
  }
}

async function upsertProgress(calendarId, day, taskId, configId, body) {
  const now = new Date();
  const existing = await getProgress(calendarId, taskId);
  const payload = {
    ...(body.payload || {}),
    configId,
  };
  const status = body.status || 'IN_PROGRESS';
  const payloadVersion = body.payloadVersion || 1;

  if (existing) {
    await query(
      `UPDATE special_window_progress
       SET status = ?, payload_version = ?, payload = ?, updated_at = ?,
           started_at = COALESCE(started_at, ?),
           completed_at = ?
       WHERE calendar_id = ? AND task_id = ?`,
      [
        status,
        payloadVersion,
        JSON.stringify(payload),
        now,
        status !== 'NOT_STARTED' ? now : null,
        status === 'COMPLETED' ? now : null,
        calendarId,
        taskId,
      ],
    );
  } else {
    await query(
      `INSERT INTO special_window_progress
         (id, calendar_id, task_id, day, status, payload_version, payload, started_at, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        calendarId,
        taskId,
        day,
        status,
        payloadVersion,
        JSON.stringify(payload),
        status !== 'NOT_STARTED' ? now : null,
        status === 'COMPLETED' ? now : null,
        now,
      ],
    );
  }

  return getProgress(calendarId, taskId);
}

async function markCompleted(calendarId, taskId) {
  const now = new Date();
  await query(
    `UPDATE special_window_progress
     SET status = 'COMPLETED', completed_at = ?, updated_at = ?
     WHERE calendar_id = ? AND task_id = ?`,
    [now, now, calendarId, taskId],
  );
  return getProgress(calendarId, taskId);
}

module.exports = {
  getProgress,
  upsertProgress,
  markCompleted,
};

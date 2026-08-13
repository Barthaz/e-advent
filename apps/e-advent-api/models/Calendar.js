const crypto = require('crypto');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

function generateEditToken() {
  return crypto.randomBytes(32).toString('hex');
}

function rowToCalendar(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    data: {
      title: row.title,
      author: row.author,
      email: row.email,
      productType: row.product_type,
      sku: row.sku,
      format: row.format || null,
      design: row.design_url ? { imageUrl: row.design_url } : null,
      tasks: typeof row.tasks === 'string' ? JSON.parse(row.tasks) : (row.tasks || []),
    },
    status: row.status,
    accessCode: row.access_code || null,
    editToken: row.edit_token || null,
    isFree: !!row.is_free,
    fulfillmentStatus: row.fulfillment_status || 'pending',
    fulfillmentNotes: row.fulfillment_notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Always generates a new server UUID and editToken.
 * Client-supplied ids are ignored.
 */
const createCalendar = async (calendarData) => {
  const id = uuidv4();
  const editToken = generateEditToken();
  const d = calendarData.data || {};

  await query(
    `INSERT INTO calendars
       (id, title, author, email, product_type, sku, format, design_url, tasks,
        status, access_code, edit_token, is_free, fulfillment_status, fulfillment_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      d.title || null,
      d.author || null,
      d.email || '',
      d.productType || 'interactive',
      d.sku || 'interactive',
      d.format || null,
      d.design?.imageUrl || null,
      JSON.stringify(d.tasks || []),
      'pending',
      null,
      editToken,
      0,
      'pending',
      null,
    ]
  );

  const [rows] = await query('SELECT * FROM calendars WHERE id = ?', [id]);
  return rowToCalendar(rows[0]);
};

const findCalendarById = async (id) => {
  if (!id) throw new Error('Calendar ID is required');
  const [rows] = await query('SELECT * FROM calendars WHERE id = ?', [String(id)]);
  return rowToCalendar(rows[0] || null);
};

const findCalendarByEmailAndAccessCode = async (email, accessCode) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedCode = String(accessCode || '').trim();
  const [rows] = await query(
    `SELECT * FROM calendars
     WHERE LOWER(email) = ? AND UPPER(access_code) = UPPER(?)
     LIMIT 1`,
    [normalizedEmail, normalizedCode]
  );
  return rowToCalendar(rows[0] || null);
};

/** True if email owns a paid/unlocked calendar (succeeded + access code). */
const hasActiveCalendarAccount = async (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return false;
  const [rows] = await query(
    `SELECT id FROM calendars
     WHERE LOWER(email) = ?
       AND status = 'succeeded'
       AND access_code IS NOT NULL
       AND access_code != ''
     LIMIT 1`,
    [normalizedEmail]
  );
  return rows.length > 0;
};

const verifyEditToken = (calendar, token) => {
  if (!calendar || !calendar.editToken || !token) return false;
  const a = Buffer.from(String(calendar.editToken));
  const b = Buffer.from(String(token));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

const verifyAccessCode = (calendar, accessCode) => {
  if (!calendar || !calendar.accessCode || !accessCode) return false;
  return String(calendar.accessCode).toUpperCase() === String(accessCode).trim().toUpperCase();
};

const updateCalendar = async (id, updateData) => {
  if (updateData && Object.prototype.hasOwnProperty.call(updateData, 'data')) {
    const err = new Error('Updating full calendar data is not allowed');
    err.code = 'CALENDAR_DATA_IMMUTABLE';
    throw err;
  }

  const allowed = {
    status: updateData.status ?? undefined,
    access_code: updateData.accessCode ?? undefined,
    is_free: updateData.isFree !== undefined ? (updateData.isFree ? 1 : 0) : undefined,
    fulfillment_status: updateData.fulfillmentStatus ?? undefined,
    fulfillment_notes: updateData.fulfillmentNotes ?? undefined,
  };

  const sets = [];
  const values = [];
  for (const [col, val] of Object.entries(allowed)) {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      values.push(val);
    }
  }

  if (sets.length === 0) {
    const [rows] = await query('SELECT * FROM calendars WHERE id = ?', [String(id)]);
    return rowToCalendar(rows[0] || null);
  }

  values.push(String(id));
  await query(`UPDATE calendars SET ${sets.join(', ')} WHERE id = ?`, values);
  const [rows] = await query('SELECT * FROM calendars WHERE id = ?', [String(id)]);
  return rowToCalendar(rows[0]);
};

const upsertCalendar = async (calendarData) => {
  if (!calendarData.data || Object.keys(calendarData.data).length === 0) {
    throw new Error('Calendar data is required and cannot be empty');
  }
  return createCalendar({ data: calendarData.data });
};

const findCalendars = async (filter = {}, options = {}) => {
  let sql = 'SELECT * FROM calendars WHERE 1=1';
  const vals = [];

  if (filter.status) {
    sql += ' AND status = ?';
    vals.push(filter.status);
  }
  if (filter.email) {
    sql += ' AND LOWER(email) = ?';
    vals.push(String(filter.email).trim().toLowerCase());
  }

  sql += ' ORDER BY created_at DESC';

  if (options.limit) { sql += ' LIMIT ?'; vals.push(options.limit); }
  if (options.skip) { sql += ' OFFSET ?'; vals.push(options.skip); }

  const [rows] = await query(sql, vals);
  return rows.map(rowToCalendar);
};

/** Update content fields only; status is never taken from client (caller passes existing status). */
const updateCalendarData = async (id, data, status) => {
  const [rows] = await query('SELECT * FROM calendars WHERE id = ?', [String(id)]);
  const existing = rows[0];
  if (!existing) return null;

  const d = data || {};
  await query(
    `UPDATE calendars SET
       title             = ?,
       author            = ?,
       email             = ?,
       product_type      = ?,
       sku               = ?,
       format            = ?,
       design_url        = ?,
       tasks             = ?,
       status            = ?
     WHERE id = ?`,
    [
      d.title || existing.title,
      d.author || existing.author,
      d.email || existing.email,
      d.productType || existing.product_type,
      d.sku || existing.sku,
      d.format || existing.format,
      d.design?.imageUrl || existing.design_url,
      JSON.stringify(d.tasks || (typeof existing.tasks === 'string' ? JSON.parse(existing.tasks) : existing.tasks) || []),
      status || existing.status,
      String(id),
    ]
  );
  const [updated] = await query('SELECT * FROM calendars WHERE id = ?', [String(id)]);
  return rowToCalendar(updated[0]);
};

const openTask = async (calendarId, day) => {
  const [rows] = await query('SELECT * FROM calendars WHERE id = ?', [String(calendarId)]);
  const cal = rows[0];
  if (!cal) throw new Error('Calendar not found');

  const tasks = typeof cal.tasks === 'string' ? JSON.parse(cal.tasks) : (cal.tasks || []);
  if (!Array.isArray(tasks)) throw new Error('Calendar does not have tasks');

  const idx = tasks.findIndex((t) => t.day === parseInt(day, 10));
  if (idx === -1) throw new Error(`Task for day ${day} not found`);

  tasks[idx] = { ...tasks[idx], status: 'opened' };

  await query('UPDATE calendars SET tasks = ? WHERE id = ?', [JSON.stringify(tasks), String(calendarId)]);
  const [updated] = await query('SELECT * FROM calendars WHERE id = ?', [String(calendarId)]);
  console.log(`Task for day ${day} opened in calendar ${calendarId}`);
  return rowToCalendar(updated[0]);
};

module.exports = {
  createCalendar,
  findCalendarById,
  findCalendarByEmailAndAccessCode,
  hasActiveCalendarAccount,
  verifyEditToken,
  verifyAccessCode,
  updateCalendar,
  updateCalendarData,
  upsertCalendar,
  findCalendars,
  openTask,
  generateEditToken,
};

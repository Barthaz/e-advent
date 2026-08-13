const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { normalizeEmail } = require('./Collaboration');

function rowToTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    collaborationId: row.collaboration_id,
    authorEmail: row.author_email,
    text: row.text,
    done: !!row.done,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listByCollaboration(collaborationId) {
  const [rows] = await query(
    `SELECT * FROM shared_tasks
     WHERE collaboration_id = ?
     ORDER BY done ASC, created_at DESC`,
    [String(collaborationId)]
  );
  return rows.map(rowToTask);
}

async function findById(id) {
  const [rows] = await query('SELECT * FROM shared_tasks WHERE id = ?', [String(id)]);
  return rowToTask(rows[0] || null);
}

async function create({ collaborationId, authorEmail, text }) {
  const id = uuidv4();
  const cleaned = String(text || '').trim();
  if (!cleaned) {
    const err = new Error('Treść zadania jest wymagana');
    err.code = 'INVALID_TEXT';
    throw err;
  }

  await query(
    `INSERT INTO shared_tasks (id, collaboration_id, author_email, text, done)
     VALUES (?, ?, ?, ?, 0)`,
    [id, String(collaborationId), normalizeEmail(authorEmail), cleaned]
  );

  return findById(id);
}

async function update(id, { text, done }) {
  const existing = await findById(id);
  if (!existing) return null;

  const sets = [];
  const vals = [];

  if (text !== undefined) {
    const cleaned = String(text).trim();
    if (!cleaned) {
      const err = new Error('Treść zadania jest wymagana');
      err.code = 'INVALID_TEXT';
      throw err;
    }
    sets.push('text = ?');
    vals.push(cleaned);
  }
  if (done !== undefined) {
    sets.push('done = ?');
    vals.push(done ? 1 : 0);
  }

  if (sets.length === 0) return existing;

  vals.push(String(id));
  await query(`UPDATE shared_tasks SET ${sets.join(', ')} WHERE id = ?`, vals);
  return findById(id);
}

async function remove(id) {
  const [result] = await query('DELETE FROM shared_tasks WHERE id = ?', [String(id)]);
  return result && result.affectedRows > 0;
}

module.exports = {
  listByCollaboration,
  findById,
  create,
  update,
  remove,
};

const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { normalizeEmail } = require('./Collaboration');

function rowToIdea(row) {
  if (!row) return null;
  return {
    id: row.id,
    collaborationId: row.collaboration_id,
    authorEmail: row.author_email,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listByCollaboration(collaborationId) {
  const [rows] = await query(
    `SELECT * FROM gift_ideas
     WHERE collaboration_id = ?
     ORDER BY created_at DESC`,
    [String(collaborationId)]
  );
  return rows.map(rowToIdea);
}

async function findById(id) {
  const [rows] = await query('SELECT * FROM gift_ideas WHERE id = ?', [String(id)]);
  return rowToIdea(rows[0] || null);
}

async function create({ collaborationId, authorEmail, text }) {
  const id = uuidv4();
  const cleaned = String(text || '').trim();
  if (!cleaned) {
    const err = new Error('Treść pomysłu jest wymagana');
    err.code = 'INVALID_TEXT';
    throw err;
  }

  await query(
    `INSERT INTO gift_ideas (id, collaboration_id, author_email, text)
     VALUES (?, ?, ?, ?)`,
    [id, String(collaborationId), normalizeEmail(authorEmail), cleaned]
  );

  return findById(id);
}

async function update(id, { text }) {
  const existing = await findById(id);
  if (!existing) return null;

  if (text === undefined) return existing;

  const cleaned = String(text).trim();
  if (!cleaned) {
    const err = new Error('Treść pomysłu jest wymagana');
    err.code = 'INVALID_TEXT';
    throw err;
  }

  await query('UPDATE gift_ideas SET text = ? WHERE id = ?', [cleaned, String(id)]);
  return findById(id);
}

async function remove(id) {
  const [result] = await query('DELETE FROM gift_ideas WHERE id = ?', [String(id)]);
  return result && result.affectedRows > 0;
}

module.exports = {
  listByCollaboration,
  findById,
  create,
  update,
  remove,
};

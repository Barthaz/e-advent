'use strict';
const { randomBytes, randomUUID } = require('node:crypto');
const { query, withTransaction } = require('../config/database');
const { applyPercentDiscount, DISCOUNT_PERCENTS } = require('../config/products');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PERCENTS = new Set(DISCOUNT_PERCENTS);

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

function isCodeFormat(code) {
  return /^[A-Z0-9-]{4,24}$/.test(code);
}

function randomCode() {
  const bytes = randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function rowToCode(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    percent: Number(row.percent),
    reusable: Boolean(Number(row.reusable)),
    active: Boolean(Number(row.active)),
    usesCount: Number(row.uses_count || 0),
    createdAt: row.created_at,
  };
}

function isAvailable(row) {
  return Boolean(row && Number(row.active) && (Number(row.reusable) || Number(row.uses_count) === 0));
}

async function findByCode(code) {
  const normalized = normalizeCode(code);
  if (!isCodeFormat(normalized)) return null;
  const [rows] = await query('SELECT * FROM discount_codes WHERE code = ?', [normalized]);
  return rows[0] || null;
}

function publicValidate(row) {
  if (!isAvailable(row)) {
    return { valid: false, discount: 0, message: 'Kod rabatowy jest nieprawidłowy albo został już wykorzystany.' };
  }
  const percent = Number(row.percent);
  return {
    valid: true,
    discount: percent,
    message: percent === 100
      ? 'Kod rabatowy jest prawidłowy. Zamówienie będzie za 0 zł.'
      : `Kod rabatowy jest prawidłowy. Zniżka ${percent}% od produktów.`,
    code: rowToCode(row),
  };
}

async function validatePromoCode(code) {
  return publicValidate(await findByCode(code));
}

async function isFullDiscountPromo(code) {
  const result = await validatePromoCode(code);
  return result.valid && result.discount === 100;
}

function applyToTotals(totals, row) {
  if (!isAvailable(row) || !totals) return null;
  return applyPercentDiscount(totals, Number(row.percent));
}

async function redeem(code, { orderId, email } = {}) {
  const normalized = normalizeCode(code);
  return withTransaction(async () => {
    if (orderId) {
      const [existing] = await query('SELECT id FROM discount_redemptions WHERE order_id = ? LIMIT 1', [orderId]);
      if (existing[0]) return { skipped: true, code: normalized };
    }
    const [rows] = await query('SELECT * FROM discount_codes WHERE code = ? FOR UPDATE', [normalized]);
    const row = rows[0];
    if (!isAvailable(row)) {
      throw Object.assign(new Error('Kod rabatowy jest nieprawidłowy albo został już wykorzystany.'), { status: 409 });
    }
    const [updated] = await query(
      'UPDATE discount_codes SET uses_count = uses_count + 1 WHERE id = ? AND active = 1 AND (reusable = 1 OR uses_count = 0)',
      [row.id],
    );
    if (!updated?.affectedRows) {
      throw Object.assign(new Error('Kod rabatowy został właśnie wykorzystany.'), { status: 409 });
    }
    await query(
      'INSERT INTO discount_redemptions (id, code_id, order_id, customer_email) VALUES (?, ?, ?, ?)',
      [randomUUID(), row.id, orderId || null, String(email || '').trim().toLowerCase().slice(0, 255)],
    );
    return rowToCode(row);
  });
}

async function createCodes({ percent, reusable, count = 1 }) {
  if (!PERCENTS.has(Number(percent))) {
    throw Object.assign(new Error('Rabat może wynosić 10%, 20% albo 100%.'), { status: 400 });
  }
  const n = Number(count);
  if (!Number.isInteger(n) || n < 1 || n > 50) {
    throw Object.assign(new Error('Można wygenerować od 1 do 50 kodów naraz.'), { status: 400 });
  }
  const created = [];
  for (let i = 0; i < n; i++) {
    let inserted = false;
    for (let attempt = 0; attempt < 8 && !inserted; attempt++) {
      const code = randomCode();
      const id = randomUUID();
      try {
        await query(
          'INSERT INTO discount_codes (id, code, percent, reusable, active, uses_count) VALUES (?, ?, ?, ?, 1, 0)',
          [id, code, Number(percent), reusable ? 1 : 0],
        );
        created.push({
          id, code, percent: Number(percent), reusable: Boolean(reusable), active: true, usesCount: 0,
        });
        inserted = true;
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error;
      }
    }
    if (!inserted) throw new Error('Nie udało się wylosować unikalnego kodu.');
  }
  return created;
}

async function ensureNamedCode({ code, percent, reusable }) {
  const normalized = normalizeCode(code);
  if (!isCodeFormat(normalized)) {
    throw Object.assign(new Error('Kod rabatowy może mieć 4–24 znaki (litery, cyfry, myślnik).'), { status: 400 });
  }
  if (!PERCENTS.has(Number(percent))) {
    throw Object.assign(new Error('Rabat może wynosić 10%, 20% albo 100%.'), { status: 400 });
  }
  const existing = await findByCode(normalized);
  if (existing) {
    await query(
      'UPDATE discount_codes SET percent = ?, reusable = ?, active = 1 WHERE id = ?',
      [Number(percent), reusable ? 1 : 0, existing.id],
    );
    const [rows] = await query('SELECT * FROM discount_codes WHERE id = ?', [existing.id]);
    return rowToCode(rows[0]);
  }
  const id = randomUUID();
  await query(
    'INSERT INTO discount_codes (id, code, percent, reusable, active, uses_count) VALUES (?, ?, ?, ?, 1, 0)',
    [id, normalized, Number(percent), reusable ? 1 : 0],
  );
  return {
    id,
    code: normalized,
    percent: Number(percent),
    reusable: Boolean(reusable),
    active: true,
    usesCount: 0,
  };
}

async function listCodes() {
  const [rows] = await query('SELECT * FROM discount_codes ORDER BY created_at DESC LIMIT 200');
  return rows.map(rowToCode);
}

async function setActive(id, active) {
  await query('UPDATE discount_codes SET active = ? WHERE id = ?', [active ? 1 : 0, String(id)]);
  const [rows] = await query('SELECT * FROM discount_codes WHERE id = ?', [String(id)]);
  if (!rows[0]) throw Object.assign(new Error('Nie znaleziono kodu rabatowego.'), { status: 404 });
  return rowToCode(rows[0]);
}

module.exports = {
  normalizeCode,
  validatePromoCode,
  isFullDiscountPromo,
  findByCode,
  isAvailable,
  applyToTotals,
  redeem,
  createCodes,
  ensureNamedCode,
  listCodes,
  setActive,
  PERCENTS: [...PERCENTS],
};

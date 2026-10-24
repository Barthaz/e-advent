'use strict';

const { query, withNamedLocks } = require('../../config/database');
const { SANTA_CERTIFICATE_SKU } = require('../../config/products');
const { fail } = require('./certificatePdf');

function parseMetadata(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return { ...raw };
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function readExistingNumber(metadata) {
  const n = Number(metadata?.certificateNumber);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Stable per-item serial: first download assigns SN-2026-00000N, later downloads reuse it.
 */
async function allocateCertificateNumber(item) {
  const fromPayload = readExistingNumber(parseMetadata(item.metadata));
  if (fromPayload) return fromPayload;

  return withNamedLocks(['certificate-serial'], async () => {
    const [rows] = await query('SELECT id, metadata FROM order_items WHERE id = ?', [item.id]);
    if (!rows.length) {
      throw fail('Nie znaleziono pozycji zamówienia.', 404, 'ITEM_NOT_FOUND');
    }
    const meta = parseMetadata(rows[0].metadata);
    const existing = readExistingNumber(meta);
    if (existing) return existing;

    const [maxRows] = await query(
      `SELECT COALESCE(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.certificateNumber')) AS UNSIGNED)), 0) AS max_n
       FROM order_items
       WHERE sku = ?`,
      [SANTA_CERTIFICATE_SKU],
    );
    const next = Number(maxRows[0]?.max_n || 0) + 1;
    await query('UPDATE order_items SET metadata = ? WHERE id = ?', [
      JSON.stringify({ ...meta, certificateNumber: next }),
      item.id,
    ]);
    return next;
  });
}

module.exports = {
  allocateCertificateNumber,
  parseMetadata,
  readExistingNumber,
};

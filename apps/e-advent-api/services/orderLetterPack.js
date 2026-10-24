'use strict';

const { query, withNamedLocks } = require('../config/database');
const {
  SANTA_LETTER_SKU,
  SANTA_CERTIFICATE_SKU,
  splitGrossAmount,
  roundPln,
  DEFAULT_VAT_RATE,
} = require('../config/products');

function fail(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

async function loadOrderItems(orderId) {
  const [orders] = await query('SELECT id, fulfillment_status FROM orders WHERE id = ?', [orderId]);
  if (!orders.length) throw fail('Nie znaleziono zamówienia.', 404);
  if (orders[0].fulfillment_status === 'cancelled') {
    throw fail('Nie można zmieniać pozycji anulowanego zamówienia.', 409);
  }
  const [items] = await query(
    'SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC, id ASC',
    [orderId],
  );
  return items;
}

function lineTotals(row, quantity) {
  const unitPrice = Number(row.unit_price);
  const vatRate = Number(row.vat_rate != null ? row.vat_rate : DEFAULT_VAT_RATE);
  const lineBrutto = roundPln(unitPrice * quantity);
  const split = splitGrossAmount(lineBrutto, vatRate);
  return {
    quantity,
    lineBrutto: split.brutto,
    lineNetto: split.netto,
    lineVat: split.vat,
  };
}

async function setLetterQuantity(row, quantity) {
  if (quantity < 1) {
    await query('DELETE FROM order_items WHERE id = ? AND order_id = ?', [row.id, row.order_id]);
    return;
  }
  const vat = lineTotals(row, quantity);
  await query(
    'UPDATE order_items SET quantity = ?, line_brutto = ?, line_netto = ?, line_vat = ? WHERE id = ?',
    [vat.quantity, vat.lineBrutto, vat.lineNetto, vat.lineVat, row.id],
  );
}

async function removeCertificate(orderId, itemId) {
  return withNamedLocks([`order-items:${orderId}`], async () => {
    const items = await loadOrderItems(orderId);
    const item = items.find((row) => row.id === itemId);
    if (!item) throw fail('Nie znaleziono pozycji zamówienia.', 404);
    if (item.sku !== SANTA_CERTIFICATE_SKU) {
      throw fail('Z pozycji zamówienia można osobno usuwać tylko certyfikaty.', 400);
    }
    await query('DELETE FROM order_items WHERE id = ? AND order_id = ?', [itemId, orderId]);
    return { removed: 'certificate', itemId, removedCertificate: true };
  });
}

async function removeOneLetter(orderId) {
  return withNamedLocks([`order-items:${orderId}`], async () => {
    const items = await loadOrderItems(orderId);
    const letters = items.filter((row) => row.sku === SANTA_LETTER_SKU);
    const certificates = items.filter((row) => row.sku === SANTA_CERTIFICATE_SKU);
    if (!letters.length) throw fail('W tym zamówieniu nie ma listów do usunięcia.', 409);

    const lastLetter = letters[letters.length - 1];
    const lastCertificate = certificates[certificates.length - 1] || null;

    await setLetterQuantity(lastLetter, Number(lastLetter.quantity) - 1);
    if (lastCertificate) {
      await query('DELETE FROM order_items WHERE id = ? AND order_id = ?', [lastCertificate.id, orderId]);
    }

    return {
      removed: 'letter',
      letterItemId: lastLetter.id,
      certificateId: lastCertificate ? lastCertificate.id : null,
      removedCertificate: Boolean(lastCertificate),
    };
  });
}

module.exports = { removeCertificate, removeOneLetter };

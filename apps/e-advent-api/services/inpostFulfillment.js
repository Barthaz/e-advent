'use strict';
const { query, withNamedLocks } = require('../config/database');
const Payment = require('../models/Payment');
const inpost = require('./inpost');
const { orderFingerprint, canonical } = require('./orderIdentity');
const { sendShipmentPreparedEmail } = require('./orderMailer');
const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
const shippedStatuses = new Set(['dispatched_by_sender', 'collected_from_sender', 'taken_by_courier', 'adopted_at_source_branch', 'sent_from_source_branch', 'adopted_at_sorting_center', 'sent_from_sorting_center', 'adopted_at_target_branch', 'out_for_delivery', 'ready_to_pickup', 'avizo']);
const confirmed = new Set(['confirmed', 'dispatched_by_sender', 'collected_from_sender', 'taken_by_courier', 'adopted_at_source_branch', 'sent_from_source_branch', 'adopted_at_sorting_center', 'sent_from_sorting_center', 'adopted_at_target_branch', 'out_for_delivery', 'ready_to_pickup', 'delivered', 'avizo', 'claimed', 'returned_to_sender']);

async function load(id) {
  const order = await Payment.findPaymentById(id);
  if (!order) throw inpost.fail('Nie znaleziono zamówienia.', 404);
  const payload = inpost.shipmentPayload(order);
  if (order.status !== 'succeeded') throw inpost.fail('Przesyłkę można przygotować dopiero po potwierdzeniu płatności.', 409);
  if (orderFingerprint(order) !== order.metadata.checkoutFingerprint) throw inpost.fail('Dane zamówienia wymagają sprawdzenia przed wysyłką.', 409);
  const [rows] = await query('SELECT * FROM order_inpost_shipments WHERE order_id = ?', [id]);
  const row = rows[0] ? { ...rows[0], payload: parse(rows[0].payload), remote: parse(rows[0].remote) } : null;
  if (row && (row.environment !== order.metadata.inpostDelivery.environment || String(row.organization_id) !== order.metadata.inpostDelivery.organizationId)) throw inpost.fail('Niezgodne konto przesyłki.', 409);
  if (row && JSON.stringify(canonical(row.payload)) !== JSON.stringify(canonical(payload))) throw inpost.fail('Zapis przesyłki nie odpowiada danym zamówienia.', 409);
  return { order, payload, row };
}

function matches(remote, payload) {
  if (remote.reference !== payload.reference) return false;
  const a = remote.receiver || {}, b = payload.receiver;
  if (['email', 'phone', 'first_name', 'last_name'].some(k => String(a[k] || '') !== String(b[k] || ''))) return false;
  if ((remote.custom_attributes?.target_point || null) !== (payload.custom_attributes?.target_point || null)) return false;
  if (b.address && Object.keys(b.address).some(k => String(a.address?.[k] || '') !== String(b.address[k] || ''))) return false;
  if (!Array.isArray(remote.parcels) || remote.parcels.length !== 1) return false;
  const p = remote.parcels[0], expected = payload.parcels[0];
  if (Number(p.weight?.amount) !== Number(expected.weight.amount) && !(expected.template && Number(p.weight?.amount) === 25)) return false;
  // Locker templates may be expanded by ShipX to template dimensions.
  if (expected.template) { if (p.template !== expected.template) return false; }
  else if (['length', 'width', 'height'].some(k => Number(p.dimensions?.[k]) !== Number(expected.dimensions[k]))) return false;
  const service = remote.selected_offer?.service?.id || remote.service;
  return !service || service === payload.service;
}

function offerFor(row) {
  return row?.remote?.offers?.find(o => o.service?.id === row.payload.service && ['available', 'selected'].includes(o.status))
    || (row?.remote?.selected_offer?.service?.id === row?.payload.service ? row.remote.selected_offer : null);
}
function offerPrice(offer) {
  if (offer?.rate == null) return null;
  const tax = process.env.INPOST_API_RATE_TAX;
  if (!['net', 'gross'].includes(tax)) throw inpost.fail('Skonfiguruj INPOST_API_RATE_TAX zgodnie z rozliczeniem konta InPost.', 503);
  const amount = Number(offer.rate);
  if (!Number.isFinite(amount) || amount < 0 || offer.currency !== 'PLN') throw inpost.fail('Nieprawidłowa cena oferty InPost.', 502);
  return Math.round(amount * (tax === 'net' ? 1.23 : 1) * 100) / 100;
}
function view(order, row) {
  const offer = offerFor(row);
  return { orderId: order.id, delivery: order.metadata.inpostDelivery,
    shipmentId: row?.shipment_id || null, state: row?.state || 'not_created',
    providerStatus: row?.remote?.status || null, trackingNumber: row?.remote?.tracking_number || null,
    labelReady: Boolean(row && (row.state === 'confirmed' || confirmed.has(row.remote?.status))),
    labelDownloadedAt: row?.label_downloaded_at || null,
    shipped: shippedStatuses.has(row?.remote?.status) || row?.remote?.status === 'delivered',
    offerId: offer?.id || null, offerPrice: offerPrice(offer),
    canBuy: Boolean(offer && !row?.buy_attempted && row?.state !== 'confirmed' && !confirmed.has(row?.remote?.status)),
    needsReview: Boolean(row && !row.shipment_id && row.state !== 'create_rejected') || Boolean(row?.buy_attempted && row?.state !== 'confirmed' && !confirmed.has(row?.remote?.status)),
  };
}

async function refreshRow(order, row) {
  if (!row?.shipment_id) return row;
  const remote = await inpost.request(`/shipments/${row.shipment_id}`);
  if (String(remote.id) !== String(row.shipment_id) || !matches(remote, row.payload)) throw inpost.fail('Dane przesyłki w InPost różnią się od zamówienia. Wymagane sprawdzenie w Managerze Paczek.', 409);
  row.remote = remote;
  row.state = row.state === 'confirmed' || confirmed.has(remote.status) ? 'confirmed' : row.buy_attempted ? 'buy_pending' : 'prepared';
  await query('UPDATE order_inpost_shipments SET remote = ?, state = ? WHERE order_id = ?', [JSON.stringify(remote), row.state, order.id]);
  await query('UPDATE orders SET inpost_shipment_id = ?, inpost_status = ?, tracking_number = COALESCE(?, tracking_number) WHERE id = ?',
    [String(row.shipment_id), remote.status || null, remote.tracking_number || null, order.id]);
  // Label creation is NOT physical dispatch. Only InPost scan statuses mark it shipped.
  if (shippedStatuses.has(remote.status)) {
    await query("UPDATE orders SET fulfillment_status = 'shipped', shipped_at = COALESCE(shipped_at, NOW()) WHERE id = ? AND fulfillment_status IN ('pending', 'processing')", [order.id]);
  }
  if (remote.status === 'delivered') {
    await query("UPDATE orders SET fulfillment_status = 'delivered', shipped_at = COALESCE(shipped_at, NOW()), delivered_at = COALESCE(delivered_at, NOW()) WHERE id = ?", [order.id]);
  }
  return row;
}

async function operate(id, action, input = {}) {
  return withNamedLocks([`inpost:${id}`], async () => {
    let { order, payload, row } = await load(id);
    if (action === 'create' && (!row || row.state === 'create_rejected')) {
      const c = inpost.config();
      if (row) await query("UPDATE order_inpost_shipments SET state = 'create_pending' WHERE order_id = ?", [id]);
      else await query('INSERT INTO order_inpost_shipments (order_id, environment, organization_id, state, payload) VALUES (?, ?, ?, ?, ?)',
        [id, c.environment, c.organizationId, 'create_pending', JSON.stringify(payload)]);
      // Persist intent BEFORE network call. Unknown result is never blindly retried.
      let remote;
      try { remote = await inpost.request(`/organizations/${c.organizationId}/shipments`, { method: 'POST', body: payload }); }
      catch (error) {
        // Definitive validation/auth rejection is safe to retry after correction.
        // Timeouts, 5xx, conflicts and rate limits remain ambiguous.
        if ([400, 401, 403, 404, 422].includes(error.providerStatus)) await query("UPDATE order_inpost_shipments SET state = 'create_rejected' WHERE order_id = ?", [id]);
        throw error;
      }
      if (!/^\d+$/.test(String(remote.id || ''))) throw inpost.fail('Brak identyfikatora przesyłki w odpowiedzi InPost. Sprawdź Manager Paczek.', 502);
      await query('UPDATE order_inpost_shipments SET shipment_id = ?, state = ?, remote = ? WHERE order_id = ?', [String(remote.id), 'prepared', JSON.stringify(remote), id]);
      row = { order_id: id, payload, shipment_id: String(remote.id), state: 'prepared', remote, buy_attempted: 0 };
    }
    if (action === 'reconcile') {
      if (!row || row.shipment_id) throw inpost.fail('Ta przesyłka nie wymaga przypisania identyfikatora.', 409);
      if (!/^\d{1,20}$/.test(String(input.shipmentId || ''))) throw inpost.fail('Podaj identyfikator przesyłki z Managera Paczek.');
      const remote = await inpost.request(`/shipments/${input.shipmentId}`);
      if (String(remote.id) !== String(input.shipmentId) || !matches(remote, payload)) throw inpost.fail('Ta przesyłka nie odpowiada zamówieniu.', 409);
      await query('UPDATE order_inpost_shipments SET shipment_id = ? WHERE order_id = ?', [String(remote.id), id]);
      row.shipment_id = String(remote.id);
    }
    if (action !== 'get') row = await refreshRow(order, row);
    if (action === 'offers' && row?.shipment_id && !row.buy_attempted && row.state !== 'confirmed' && !confirmed.has(row.remote?.status)) {
      await inpost.request(`/shipments/${row.shipment_id}`, { method: 'PUT', body: {} });
      row = await refreshRow(order, row);
    }
    if (action === 'buy') {
      const offer = offerFor(row);
      if (!row || !offer || row.buy_attempted || row.state === 'confirmed' || confirmed.has(row.remote?.status)) throw inpost.fail('Zakup już rozpoczęto lub oferta nie jest gotowa. Odśwież status.', 409);
      const price = offerPrice(offer);
      if (String(input.offerId) !== String(offer.id) || input.acceptedPrice !== price) throw inpost.fail('Oferta zmieniła się. Sprawdź cenę i potwierdź zakup ponownie.', 409);
      if (offer.expires_at && new Date(offer.expires_at).getTime() <= Date.now()) throw inpost.fail('Oferta wygasła. Odśwież oferty.', 409);
      await query("UPDATE order_inpost_shipments SET buy_attempted = 1, state = 'buy_pending' WHERE order_id = ?", [id]);
      await inpost.request(`/shipments/${row.shipment_id}/buy`, { method: 'POST', body: { offer_id: offer.id } });
      row.buy_attempted = 1;
      row = await refreshRow(order, row);
    }
    if (action === 'label') {
      if (!row || (row.state !== 'confirmed' && !confirmed.has(row.remote?.status))) throw inpost.fail('Etykieta będzie dostępna po potwierdzeniu zakupu przez InPost.', 409);
      return inpost.request(`/shipments/${row.shipment_id}/label?format=Pdf&type=A6`, { pdf: true });
    }
    return view(order, row);
  });
}

// Called after a successful label download: the parcel is packed, so the order
// moves to "processing" and the customer gets one "prepared" email.
async function markLabelPrepared(id) {
  await query("UPDATE orders SET label_created_at = COALESCE(label_created_at, NOW()), fulfillment_status = IF(fulfillment_status = 'pending', 'processing', fulfillment_status) WHERE id = ?", [id]);
  await query('UPDATE order_inpost_shipments SET label_downloaded_at = COALESCE(label_downloaded_at, NOW()) WHERE order_id = ?', [id]);
  try {
    const result = await sendShipmentPreparedEmail(await Payment.findPaymentById(id), 'admin');
    return { email: result.skipped ? 'skipped' : result.sent ? 'sent' : 'failed', error: result.results[0]?.error || null };
  } catch (error) {
    return { email: 'failed', error: error.message };
  }
}

// Fallback for missing/undeliverable webhooks (e.g. localhost): poll open shipments.
async function syncActiveShipments({ limit = 50 } = {}) {
  let c;
  try { c = inpost.config(); } catch { return { skipped: true, refreshed: 0, failed: 0 }; }
  const [rows] = await query(`SELECT s.order_id FROM order_inpost_shipments s JOIN orders o ON o.id = s.order_id
    WHERE s.shipment_id IS NOT NULL AND s.environment = ? AND s.organization_id = ?
      AND o.fulfillment_status NOT IN ('delivered', 'cancelled')
    ORDER BY s.updated_at ASC LIMIT ?`, [c.environment, c.organizationId, limit]);
  let refreshed = 0, failed = 0;
  for (const { order_id: orderId } of rows) {
    try { await operate(orderId, 'refresh'); refreshed++; } catch { failed++; }
  }
  return { skipped: false, refreshed, failed };
}

module.exports = { operate, matches, offerPrice, markLabelPrepared, syncActiveShipments };

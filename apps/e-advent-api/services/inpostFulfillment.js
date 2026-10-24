'use strict';
const { query, withNamedLocks } = require('../config/database');
const Payment = require('../models/Payment');
const EmailSend = require('../models/EmailSend');
const inpost = require('./inpost');
const { orderFingerprint, canonical } = require('./orderIdentity');
const { sendShipmentPreparedEmail, sendShippingEmailForOrder } = require('./orderMailer');
const parse = (value) => {
  try {
    if (value == null) return null;
    const raw = Buffer.isBuffer(value) ? value.toString('utf8') : value;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw inpost.fail('Zapis przesyłki jest uszkodzony. Sprawdź zamówienie w Managerze Paczek.', 409);
  }
};

function snapshotRemote(remote) {
  if (!remote || typeof remote !== 'object') return remote;
  const slimOffer = (offer) => offer && ({
    id: offer.id,
    status: offer.status,
    currency: offer.currency,
    rate: offer.rate,
    expires_at: offer.expires_at,
    service: offer.service,
  });
  return {
    id: remote.id,
    status: remote.status,
    tracking_number: remote.tracking_number,
    service: remote.service,
    reference: remote.reference,
    custom_attributes: remote.custom_attributes,
    receiver: remote.receiver,
    parcels: remote.parcels,
    offers: Array.isArray(remote.offers) ? remote.offers.map(slimOffer) : remote.offers,
    selected_offer: slimOffer(remote.selected_offer),
  };
}

function clip(value, max) {
  if (value == null || value === '') return null;
  return String(value).slice(0, max);
}
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
  const delivery = order.metadata?.inpostDelivery;
  if (row && delivery && (row.environment !== delivery.environment || String(row.organization_id) !== String(delivery.organizationId))) throw inpost.fail('Niezgodne konto przesyłki.', 409);
  if (row && row.payload && JSON.stringify(canonical(row.payload)) !== JSON.stringify(canonical(payload))) throw inpost.fail('Zapis przesyłki nie odpowiada danym zamówienia.', 409);
  return { order, payload, row };
}

function shipmentMatches(remote, payload) {
  if (!remote || !payload) return false;
  if (remote.reference !== payload.reference) return false;
  const a = remote.receiver || {};
  const b = payload.receiver || {};
  if (['email', 'phone', 'first_name', 'last_name'].some((k) => String(a[k] || '') !== String(b[k] || ''))) return false;
  if ((remote.custom_attributes?.target_point || null) !== (payload.custom_attributes?.target_point || null)) return false;
  if (b.address && Object.keys(b.address).some((k) => String(a.address?.[k] || '') !== String(b.address[k] || ''))) return false;
  if (!Array.isArray(remote.parcels) || remote.parcels.length !== 1) return false;
  const p = remote.parcels[0];
  const expected = payload.parcels?.[0];
  if (!p || !expected) return false;
  if (Number(p.weight?.amount) !== Number(expected.weight?.amount) && !(expected.template && Number(p.weight?.amount) === 25)) return false;
  // Locker templates may be expanded by ShipX to template dimensions.
  if (expected.template) {
    if (p.template !== expected.template) return false;
  } else if (['length', 'width', 'height'].some((k) => Number(p.dimensions?.[k]) !== Number(expected.dimensions?.[k]))) {
    return false;
  }
  const service = remote.selected_offer?.service?.id || remote.service;
  return !service || service === payload.service;
}

function matches(remote, payload) {
  try {
    return shipmentMatches(remote, payload);
  } catch {
    return false;
  }
}

function offerFor(row) {
  const service = row?.payload?.service;
  if (!row?.remote || !service) return null;
  return row.remote.offers?.find(o => o.service?.id === service && ['available', 'selected'].includes(o.status))
    || (row.remote.selected_offer?.service?.id === service ? row.remote.selected_offer : null);
}
function offerPrice(offer) {
  if (offer?.rate == null) return null;
  const tax = process.env.INPOST_API_RATE_TAX;
  if (!['net', 'gross'].includes(tax)) throw inpost.fail('Skonfiguruj INPOST_API_RATE_TAX zgodnie z rozliczeniem konta InPost.', 503);
  const amount = Number(offer.rate);
  if (!Number.isFinite(amount) || amount < 0 || offer.currency !== 'PLN') throw inpost.fail('Nieprawidłowa cena oferty InPost.', 502);
  return Math.round(amount * (tax === 'net' ? 1.23 : 1) * 100) / 100;
}
function isPaid(row) {
  return Boolean(row && (row.state === 'confirmed' || confirmed.has(row.remote?.status)));
}
async function view(order, row) {
  const offer = offerFor(row);
  const labelReady = isPaid(row);
  const trackingNumber = row?.remote?.tracking_number || null;
  let shippedNotified = false;
  try {
    shippedNotified = order.customerEmail
      ? await EmailSend.hasSuccessfulOrderEmail(order.id, null, 'shipping', order.customerEmail)
      : false;
  } catch (error) {
    console.error('InPost shipping-email lookup failed:', order.id, error.message);
  }
  return { orderId: order.id, delivery: order.metadata.inpostDelivery,
    shipmentId: row?.shipment_id || null, state: row?.state || 'not_created',
    providerStatus: row?.remote?.status || null, trackingNumber,
    labelReady, labelDownloadedAt: row?.label_downloaded_at || null,
    shipped: shippedStatuses.has(row?.remote?.status) || row?.remote?.status === 'delivered',
    dispatched: ['shipped', 'delivered'].includes(order.fulfillmentStatus),
    shippedNotified: Boolean(shippedNotified),
    offerId: offer?.id || null, offerPrice: safeOfferPrice(offer),
    canBuy: Boolean(offer && !row?.buy_attempted && !labelReady),
    needsReview: Boolean(row && !row.shipment_id && row.state !== 'create_rejected')
      || Boolean(row?.buy_attempted && !labelReady),
  };
}

function safeOfferPrice(offer) {
  try {
    return offerPrice(offer);
  } catch (error) {
    if (error.status === 503) return null;
    throw error;
  }
}

async function persistShipment(order, row) {
  if (!order || !row) return;
  try {
    await query(
      'UPDATE order_inpost_shipments SET remote = ?, state = ? WHERE order_id = ?',
      [JSON.stringify(snapshotRemote(row.remote)), row.state, order.id],
    );
    await query(
      'UPDATE orders SET inpost_shipment_id = ?, inpost_status = ?, tracking_number = COALESCE(?, tracking_number) WHERE id = ?',
      [
        clip(row.shipment_id, 30),
        clip(row.remote?.status, 50),
        clip(row.remote?.tracking_number, 100),
        order.id,
      ],
    );
  } catch (error) {
    if (error.status) throw error;
    console.error('InPost shipment persist failed:', order.id, error.code || error.message);
    throw inpost.fail(`Nie udało się zapisać stanu przesyłki${error.code ? ` (${error.code})` : ''}. Odśwież status przed kolejną próbą.`, 503);
  }
}

async function refreshRow(order, row) {
  if (!row?.shipment_id) return row;
  const remote = await inpost.request(`/shipments/${row.shipment_id}`);
  if (String(remote.id) !== String(row.shipment_id)) {
    throw inpost.fail('Dane przesyłki w InPost różnią się od zamówienia. Wymagane sprawdzenie w Managerze Paczek.', 409);
  }
  // Same ShipX id: persist live status. Parcel drift is ignored here — matches() is for reconcile.
  row.remote = remote;
  row.state = isPaid(row) ? 'confirmed' : row.buy_attempted ? 'buy_pending' : 'prepared';
  await persistShipment(order, row);
  if (remote.tracking_number) order.trackingNumber = order.trackingNumber || remote.tracking_number;
  // Provider scans update local status as a fallback. The customer "wysłane"
  // mail is sent only from the panel dispatch action.
  if (shippedStatuses.has(remote.status)) {
    await query("UPDATE orders SET fulfillment_status = 'shipped', shipped_at = COALESCE(shipped_at, NOW()) WHERE id = ? AND fulfillment_status IN ('pending', 'processing')", [order.id]);
    if (!['delivered', 'cancelled', 'hold'].includes(order.fulfillmentStatus)) order.fulfillmentStatus = 'shipped';
  }
  if (remote.status === 'delivered') {
    await query("UPDATE orders SET fulfillment_status = 'delivered', shipped_at = COALESCE(shipped_at, NOW()), delivered_at = COALESCE(delivered_at, NOW()) WHERE id = ?", [order.id]);
    order.fulfillmentStatus = 'delivered';
  }
  return row;
}

async function createShipment(id, payload, row) {
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
  await query('UPDATE order_inpost_shipments SET shipment_id = ?, state = ?, remote = ? WHERE order_id = ?', [String(remote.id), 'prepared', JSON.stringify(snapshotRemote(remote)), id]);
  return { order_id: id, payload, shipment_id: String(remote.id), state: 'prepared', remote, buy_attempted: 0 };
}

async function buyOffer(id, row, offer) {
  if (offer.expires_at && new Date(offer.expires_at).getTime() <= Date.now()) throw inpost.fail('Oferta wygasła. Odśwież oferty.', 409);
  await query("UPDATE order_inpost_shipments SET buy_attempted = 1, state = 'buy_pending' WHERE order_id = ?", [id]);
  await inpost.request(`/shipments/${row.shipment_id}/buy`, { method: 'POST', body: { offer_id: offer.id } });
  row.buy_attempted = 1;
  return row;
}

async function operate(id, action, input = {}) {
  return withNamedLocks([`inpost:${id}`], async () => {
    let { order, payload, row } = await load(id);
    if ((action === 'create' || action === 'generate') && (!row || row.state === 'create_rejected')) {
      row = await createShipment(id, payload, row);
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
    if ((action === 'offers' || action === 'generate') && row?.shipment_id && !row.buy_attempted && !isPaid(row)) {
      if (action === 'offers' || !offerFor(row)) {
        await inpost.request(`/shipments/${row.shipment_id}`, { method: 'PUT', body: {} });
        row = await refreshRow(order, row);
      }
    }
    if (action === 'buy' || action === 'generate') {
      const offer = offerFor(row);
      if (action === 'buy') {
        if (!row || !offer || row.buy_attempted || isPaid(row)) throw inpost.fail('Zakup już rozpoczęto lub oferta nie jest gotowa. Odśwież status.', 409);
        if (String(input.offerId) !== String(offer.id) || input.acceptedPrice !== offerPrice(offer)) throw inpost.fail('Oferta zmieniła się. Sprawdź cenę i potwierdź zakup ponownie.', 409);
        row = await buyOffer(id, row, offer);
        row = await refreshRow(order, row);
      } else if (offer && !row.buy_attempted && !isPaid(row)) {
        // Panel "Generuj etykietę" accepts the live offer in this same request.
        row = await buyOffer(id, row, offer);
        row = await refreshRow(order, row);
      }
    }
    if (action === 'label') {
      if (!row || !isPaid(row)) throw inpost.fail('Etykieta będzie dostępna po potwierdzeniu zakupu przez InPost.', 409);
      return inpost.request(`/shipments/${row.shipment_id}/label?format=Pdf&type=A6`, { pdf: true });
    }
    return view(order, row);
  });
}

async function notifyPrepared(id, { downloaded = false, trackingNumber, triggeredBy = 'admin' } = {}) {
  // Two simultaneous notifies (buy + download) share this lock.
  return withNamedLocks([`shipment-email:${id}`], async () => {
    await query("UPDATE orders SET label_created_at = COALESCE(label_created_at, NOW()), fulfillment_status = IF(fulfillment_status = 'pending', 'processing', fulfillment_status) WHERE id = ?", [id]);
    if (downloaded) {
      await query('UPDATE order_inpost_shipments SET label_downloaded_at = COALESCE(label_downloaded_at, NOW()) WHERE order_id = ?', [id]);
    }
    try {
      const order = await Payment.findPaymentById(id);
      const payload = trackingNumber && !order?.trackingNumber ? { ...order, trackingNumber } : order;
      const result = await sendShipmentPreparedEmail(payload, triggeredBy);
      return { email: result.skipped ? 'skipped' : result.sent ? 'sent' : 'failed', error: result.results[0]?.error || null };
    } catch (error) {
      return { email: 'failed', error: error.message };
    }
  });
}

async function notifyShipped(id, { trackingNumber } = {}) {
  return withNamedLocks([`shipment-email:${id}`], async () => {
    try {
      const order = await Payment.findPaymentById(id);
      const payload = trackingNumber && !order?.trackingNumber ? { ...order, trackingNumber } : order;
      const result = await sendShippingEmailForOrder(payload, 'admin');
      return { email: result.skipped ? 'skipped' : result.sent ? 'sent' : 'failed', error: result.results[0]?.error || null };
    } catch (error) {
      return { email: 'failed', error: error.message };
    }
  });
}

async function markLabelPrepared(id, { downloaded = true } = {}) {
  return notifyPrepared(id, { downloaded, triggeredBy: 'admin' });
}

async function markDispatched(id) {
  const current = await withNamedLocks([`inpost:${id}`], async () => {
    let { order, row } = await load(id);
    row = await refreshRow(order, row);
    const snapshot = await view(order, row);
    if (!snapshot.labelReady) throw inpost.fail('Najpierw wygeneruj etykietę.', 409);
    if (!snapshot.trackingNumber) throw inpost.fail('InPost nie zwrócił jeszcze numeru przesyłki. Odśwież status.', 409);
    await query("UPDATE orders SET fulfillment_status = IF(fulfillment_status IN ('pending', 'processing'), 'shipped', fulfillment_status), shipped_at = COALESCE(shipped_at, NOW()) WHERE id = ?", [id]);
    if (!['delivered', 'cancelled', 'hold'].includes(order.fulfillmentStatus)) order.fulfillmentStatus = 'shipped';
    return view(order, row);
  });
  const notified = await notifyShipped(id, { trackingNumber: current.trackingNumber });
  return {
    ...current,
    dispatched: true,
    shippedNotified: notified.email === 'sent' || notified.email === 'skipped' || current.shippedNotified,
    shippedEmail: notified.email,
    shippedEmailError: notified.error,
  };
}

// Stripe webhook / cron: create the ShipX shipment only. The label is bought from the panel.
async function ensureShipment(orderId) {
  const order = await Payment.findPaymentById(orderId);
  if (!order?.metadata?.inpostDelivery || order.status !== 'succeeded') return { skipped: true };
  try {
    return { skipped: false, shipment: await operate(orderId, 'create') };
  } catch (error) {
    console.error('InPost auto-create failed:', orderId, error.message);
    return { skipped: false, error: error.message };
  }
}

// InPost webhook / cron: refresh live status only. Labels are bought from the panel.
async function advanceShipment(orderId) {
  return operate(orderId, 'refresh');
}

async function createMissingShipments({ limit = 20 } = {}) {
  try { inpost.config(); } catch { return { skipped: true, created: 0, failed: 0 }; }
  const [rows] = await query(`SELECT o.id FROM orders o LEFT JOIN order_inpost_shipments s ON s.order_id = o.id
    WHERE o.status = 'succeeded' AND o.delivery_type LIKE '%inpost%' AND s.order_id IS NULL
      AND o.fulfillment_status NOT IN ('delivered', 'cancelled')
    ORDER BY o.created_at ASC LIMIT ?`, [limit]);
  let created = 0, failed = 0;
  for (const { id } of rows) {
    const result = await ensureShipment(id);
    if (result.shipment) created++;
    else if (result.error) failed++;
  }
  return { skipped: false, created, failed };
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
    try { await advanceShipment(orderId); refreshed++; } catch { failed++; }
  }
  return { skipped: false, refreshed, failed };
}

module.exports = {
  operate, matches, offerPrice, markLabelPrepared, markDispatched,
  syncActiveShipments, ensureShipment, createMissingShipments, advanceShipment,
};

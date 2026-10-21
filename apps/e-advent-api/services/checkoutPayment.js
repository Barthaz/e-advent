'use strict';

const { createHash } = require('node:crypto');
const { query, withTransaction, withNamedLocks } = require('../config/database');
const Payment = require('../models/Payment');
const stripe = require('../config/stripe');
const { resolveCheckoutItems } = require('./orderCheckout');
const { formatOrderNumber } = require('../utils/orderNumber');
const { orderFingerprint } = require('./orderIdentity');

function hash(value) { return createHash('sha256').update(value).digest('hex'); }
function conflict(message) { return Object.assign(new Error(message), { status: 409 }); }

// The session token authorizes checkout retries/changes; it is neither the
// database UUID nor the readable customer order number. Only its hash is stored.
async function initializeCheckout(request, clientIP) {
  if (!/^[a-f0-9]{64}$/.test(request.checkoutToken || '')) {
    throw Object.assign(new Error('Odśwież stronę płatności — wymagany jest token zakupu.'), { status: 400 });
  }
  const owner = hash(request.checkoutToken);
  const rawItems = request.items?.length ? request.items : [{ calendarId: request.productId }];
  const ids = [...new Set(rawItems.map(item => item.calendarId || item.productId).filter(Boolean))];
  return withNamedLocks([`checkout:${owner}`, ...ids.map(id => `calendar:${id}`)], async () => {
    const resolved = await resolveCheckoutItems(request);
    if (resolved.errors) throw Object.assign(new Error(resolved.errors[0].msg), {
      status: resolved.errors[0].msg.includes('Calendar not found') ? 404 : 400, errors: resolved.errors,
    });
    const { items, totals, delivery, shippingAddress, primaryProductId, primarySku, primaryProductType, hasPhysical } = resolved;
    if (Number(request.amount) !== totals.total) throw Object.assign(new Error(`Amount must be exactly ${totals.total} PLN for this order.`), { status: 400 });
    const customerEmail = String(request.customerEmail).trim().toLowerCase();
    const orderItems = items.map((item, index) => ({
      sku: item.sku, productType: item.productType, quantity: item.quantity,
      unitPrice: item.unitPrice, calendarId: item.calendarId,
      requiresShipping: item.requiresShipping,
      vatRate: totals.lines[index].vatRate, unitPriceNetto: totals.lines[index].unitPriceNetto,
      lineNetto: totals.lines[index].lineNetto, lineVat: totals.lines[index].lineVat, lineBrutto: totals.lines[index].lineBrutto,
      metadata: { ...item.metadata, ...(item.calendar ? {
        calendarId: item.calendarId,
        ownerEmail: String(item.calendar.data.email || '').trim().toLowerCase(),
        calendarTitle: item.calendar.data.title || '',
      } : {}) },
    }));
    const fingerprint = orderFingerprint({ metadata: delivery ? { inpostDelivery: delivery } : {}, customerEmail, shippingAddress, items: orderItems, currency: 'pln', amount: totals.total, shippingAmount: totals.shipping });
    const [sessions] = await query('SELECT order_id FROM checkout_sessions WHERE id = ?', [owner]);
    let order = sessions[0]?.order_id ? await Payment.findPaymentById(sessions[0].order_id) : null;
    // A design may not belong to another open checkout, even for the same email.
    for (const id of ids) {
      const linked = await Payment.findPayments({ productId: id });
      if (linked.some(other => other.id !== order?.id && other.status !== 'canceled')) {
        throw conflict('Kalendarz jest już przypisany do innego zamówienia. Wróć do rozpoczętej płatności.');
      }
    }
    let intent;
    if (order) {
      intent = await ensureIntent(order);
      if (order.metadata.checkoutFingerprint !== fingerprint || intent.status === 'canceled') {
        if (['processing', 'succeeded', 'requires_capture'].includes(intent.status) || order.status === 'succeeded') {
          throw conflict('Płatność została rozpoczęta. Poczekaj na jej wynik przed zmianą zamówienia.');
        }
        if (intent.status !== 'canceled') {
          const canceled = await stripe.paymentIntents.cancel(intent.id);
          if (canceled.status !== 'canceled') throw conflict('Nie udało się anulować poprzedniej płatności.');
        }
        await Payment.updatePaymentStatus(intent.id, 'canceled');
        order = null;
        intent = null;
      }
    }
    if (!order) {
      // Commit order + items + session BEFORE contacting Stripe. A retry after a
      // timeout recovers this exact order and uses its UUID as idempotency key.
      order = await withTransaction(async () => {
        const created = await Payment.createPayment({
          amount: totals.total, shippingAmount: totals.shipping, amountNetto: totals.amountNetto,
          vatAmount: totals.vatAmount, shippingNetto: totals.shippingNetto, shippingVat: totals.shippingVat,
          vatRate: totals.vatRate, currency: 'pln', customerEmail, productId: primaryProductId,
          productType: primaryProductType, sku: primarySku, shippingAddress, hasPhysical, items: orderItems,
          metadata: { ...(delivery ? { inpostDelivery: delivery } : {}), checkoutVersion: 2, checkoutFingerprint: fingerprint, clientIP,
            clientOrderId: String(request.orderId || '').slice(0, 200) },
        });
        await query('INSERT INTO checkout_sessions (id, order_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE order_id = VALUES(order_id)', [owner, created.id]);
        return created;
      });
    }
    intent = intent || await ensureIntent(order);
    return {
      clientSecret: intent.client_secret, paymentIntentId: intent.id,
      orderId: order.id, orderNumber: order.orderNumberDisplay || formatOrderNumber(order.orderNumber),
      productId: primaryProductId, amount: order.amount, shipping: order.shippingAmount,
      subtotal: totals.subtotal, items: order.items,
    };
  });
}

async function ensureIntent(order) {
  if (!formatOrderNumber(order.orderNumber)) throw new Error('Readable order number is missing');
  if (orderFingerprint(order) !== order.metadata.checkoutFingerprint) throw new Error('Saved order snapshot mismatch');
  let intent;
  if (order.stripePaymentIntentId) {
    intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
  } else {
    // Stripe may prune idempotency keys after 24h. Never risk creating a second
    // intent after an ambiguous old creation: require operator reconciliation.
    if (Date.now() - new Date(order.createdAt).getTime() > 23 * 60 * 60 * 1000) {
      throw conflict('Zamówienie wymaga sprawdzenia płatności przez obsługę sklepu.');
    }
    intent = await stripe.paymentIntents.create({
      amount: Math.round(order.amount * 100), currency: order.currency,
      automatic_payment_methods: { enabled: true },
      metadata: { orderId: order.id, orderNumber: order.orderNumberDisplay || formatOrderNumber(order.orderNumber) || '',
        customerEmail: order.customerEmail, checkoutFingerprint: order.metadata.checkoutFingerprint,
        checkoutVersion: '2' },
    }, { idempotencyKey: `order:${order.id}` });
    await query('UPDATE orders SET stripe_payment_intent_id = ? WHERE id = ? AND stripe_payment_intent_id IS NULL', [intent.id, order.id]);
    const saved = await Payment.findPaymentById(order.id);
    if (saved?.stripePaymentIntentId !== intent.id) throw new Error('Payment intent could not be bound to order');
    order.stripePaymentIntentId = intent.id;
  }
  if (intent.metadata?.orderId !== order.id || intent.metadata?.customerEmail !== order.customerEmail
      || intent.metadata?.checkoutFingerprint !== order.metadata.checkoutFingerprint
      || intent.amount !== Math.round(order.amount * 100) || intent.currency !== order.currency) {
    throw new Error('Stripe order identity mismatch');
  }
  return intent;
}

// Caller holds the calendar lock and has checked its edit token. Invalidate an
// exposed payment before changing its design/recipient or activating a promo.
async function cancelCalendarCheckout(calendarId, { singleOnly = false } = {}) {
  const orders = await Payment.findPayments({ productId: calendarId });
  for (const order of orders || []) {
    if (order.status === 'canceled') continue;
    if (order.status === 'succeeded' || (singleOnly && order.items?.some(item => item.calendarId !== calendarId))) {
      throw conflict('Kalendarz należy do opłaconego zamówienia lub koszyka. Najpierw sprawdź jego płatność.');
    }
    const intent = order.stripePaymentIntentId
      ? await stripe.paymentIntents.retrieve(order.stripePaymentIntentId) : await ensureIntent(order);
    if (['processing', 'succeeded', 'requires_capture'].includes(intent.status)) {
      throw conflict('Płatność jest w toku. Poczekaj na jej wynik przed zmianą kalendarza.');
    }
    if (intent.status !== 'canceled') {
      const canceled = await stripe.paymentIntents.cancel(intent.id);
      if (canceled.status !== 'canceled') throw conflict('Nie udało się anulować płatności.');
    }
    await Payment.updatePaymentStatus(intent.id, 'canceled');
  }
}

module.exports = { initializeCheckout, cancelCalendarCheckout };

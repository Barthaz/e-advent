'use strict';

const { createHash } = require('node:crypto');
const { query, withNamedLocks } = require('../config/database');
const Payment = require('../models/Payment');
const stripe = require('../config/stripe');
const { resolveCheckoutItems } = require('./orderCheckout');
const { formatOrderNumber } = require('../utils/orderNumber');
const { orderFingerprint } = require('./orderIdentity');
const { normalizeCode } = require('./discountCodes');

function hash(value) { return createHash('sha256').update(value).digest('hex'); }
function conflict(message) { return Object.assign(new Error(message), { status: 409 }); }
function wantsOrder(request, totals) {
  return Number(totals.total) === 0 || Boolean(request.acceptanceData?.termsAcceptedAt);
}

async function loadSession(owner) {
  const [rows] = await query(
    'SELECT order_id, payment_intent_id, fingerprint FROM checkout_sessions WHERE id = ?',
    [owner],
  );
  return rows[0] || null;
}

async function saveSession(owner, { orderId = null, paymentIntentId, fingerprint }) {
  await query(
    `INSERT INTO checkout_sessions (id, order_id, payment_intent_id, fingerprint)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       order_id = VALUES(order_id),
       payment_intent_id = VALUES(payment_intent_id),
       fingerprint = VALUES(fingerprint)`,
    [owner, orderId, paymentIntentId, fingerprint],
  );
}

async function retrieveIntent(id) {
  if (!id) return null;
  try {
    return await stripe.paymentIntents.retrieve(id);
  } catch (error) {
    if (error?.code === 'resource_missing' || error?.statusCode === 404) return null;
    throw error;
  }
}

function isInFlight(intent) {
  return Boolean(intent && ['processing', 'requires_capture', 'succeeded'].includes(intent.status));
}

function isReusableIntent(intent) {
  return Boolean(intent && ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(intent.status));
}

async function cancelUnusedIntent(intent) {
  if (!intent || intent.status === 'canceled') return;
  if (isInFlight(intent)) {
    throw conflict('Płatność została rozpoczęta. Poczekaj na jej wynik przed zmianą zamówienia.');
  }
  const canceled = await stripe.paymentIntents.cancel(intent.id);
  if (canceled.status !== 'canceled') throw conflict('Nie udało się anulować poprzedniej płatności.');
}

async function cancelUnusedOrder(order) {
  if (!order || order.status === 'canceled' || order.status === 'succeeded') return;
  if (order.stripePaymentIntentId) {
    await Payment.updatePaymentStatus(order.stripePaymentIntentId, 'canceled');
  } else {
    await query("UPDATE orders SET status = 'canceled' WHERE id = ? AND status <> 'succeeded'", [order.id]);
  }
}

function assertDraftIntent(intent, { fingerprint, customerEmail, amount, currency }) {
  if (!isReusableIntent(intent)
      || intent.metadata?.checkoutFingerprint !== fingerprint
      || intent.metadata?.customerEmail !== customerEmail
      || intent.amount !== Math.round(amount * 100)
      || intent.currency !== currency) {
    throw new Error('Stripe order identity mismatch');
  }
}

function assertCommittedIntent(intent, order) {
  if (intent.metadata?.orderId !== order.id || intent.metadata?.customerEmail !== order.customerEmail
      || intent.metadata?.checkoutFingerprint !== order.metadata.checkoutFingerprint
      || intent.amount !== Math.round(order.amount * 100) || intent.currency !== order.currency) {
    throw new Error('Stripe order identity mismatch');
  }
}

async function createDraftIntent({ owner, fingerprint, customerEmail, amount, currency, replacementOf }) {
  const idempotencyKey = replacementOf
    ? `checkout:${owner}:${fingerprint}:after:${replacementOf}`
    : `checkout:${owner}:${fingerprint}`;
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    automatic_payment_methods: { enabled: true },
    metadata: {
      checkoutOwner: owner,
      checkoutFingerprint: fingerprint,
      customerEmail,
      checkoutVersion: '2',
    },
  }, { idempotencyKey });
}

function orderMetadataPatch(intent, { owner, fingerprint, customerEmail, order }) {
  return {
    metadata: {
      ...intent.metadata,
      checkoutOwner: owner,
      checkoutFingerprint: fingerprint,
      customerEmail,
      checkoutVersion: '2',
      orderId: order.id,
      orderNumber: order.orderNumberDisplay || formatOrderNumber(order.orderNumber) || '',
    },
  };
}

async function bindIntentToOrder(intent, { owner, fingerprint, customerEmail, order }) {
  let bound = await stripe.paymentIntents.update(intent.id, orderMetadataPatch(intent, {
    owner, fingerprint, customerEmail, order,
  }));
  if (!bound.client_secret) bound = await stripe.paymentIntents.retrieve(bound.id);
  assertCommittedIntent(bound, order);
  return bound;
}

// The session token authorizes checkout retries/changes; it is neither the
// database UUID nor the readable customer order number. Only its hash is stored.
async function initializeCheckout(request, clientIP) {
  if (!/^[a-f0-9]{64}$/.test(request.checkoutToken || '')) {
    throw Object.assign(new Error('Odśwież stronę płatności — wymagany jest token zakupu.'), { status: 400 });
  }
  const owner = hash(request.checkoutToken);
  const rawItems = request.items?.length ? request.items : [{ calendarId: request.productId }];
    const ids = [...new Set(rawItems.map(item => item.calendarId || item.productId).filter(Boolean))];
    const discountLock = request.promoCode ? [`discount:${normalizeCode(request.promoCode)}`] : [];
    return withNamedLocks([`checkout:${owner}`, ...ids.map(id => `calendar:${id}`), ...discountLock], async () => {
    const resolved = await resolveCheckoutItems(request);
    if (resolved.errors) throw Object.assign(new Error(resolved.errors[0].msg), {
      status: resolved.errors[0].msg.includes('Calendar not found') ? 404 : 400, errors: resolved.errors,
    });
    const { items, totals, delivery, shippingAddress, primaryProductId, primarySku, primaryProductType, hasPhysical, discount } = resolved;
    if (Number(request.amount) !== totals.total) throw Object.assign(new Error(`Amount must be exactly ${totals.total} PLN for this order.`), { status: 400 });
    const customerEmail = String(request.customerEmail).trim().toLowerCase();
    const orderItems = items.map((item, index) => ({
      sku: item.sku, productType: item.productType, quantity: item.quantity,
      unitPrice: totals.lines[index].unitPrice, calendarId: item.calendarId,
      requiresShipping: item.requiresShipping,
      vatRate: totals.lines[index].vatRate, unitPriceNetto: totals.lines[index].unitPriceNetto,
      lineNetto: totals.lines[index].lineNetto, lineVat: totals.lines[index].lineVat, lineBrutto: totals.lines[index].lineBrutto,
      metadata: { ...item.metadata, ...(item.calendar ? {
        calendarId: item.calendarId,
        ownerEmail: String(item.calendar.data.email || '').trim().toLowerCase(),
        calendarTitle: item.calendar.data.title || '',
      } : {}) },
    }));
    const fingerprint = orderFingerprint({
      metadata: { ...(delivery ? { inpostDelivery: delivery } : {}), ...(discount ? { discount } : {}) },
      customerEmail, shippingAddress, items: orderItems, currency: 'pln', amount: totals.total,
      shippingAmount: totals.shipping, rabat: discount?.code || null,
    });
    const session = await loadSession(owner);
    let order = session?.order_id ? await Payment.findPaymentById(session.order_id) : null;
    // A design may not belong to another open checkout, even for the same email.
    for (const id of ids) {
      const linked = await Payment.findPayments({ productId: id });
      if (linked.some(other => other.id !== order?.id && other.status !== 'canceled')) {
        throw conflict('Kalendarz jest już przypisany do innego zamówienia. Wróć do rozpoczętej płatności.');
      }
    }
    let intent = await retrieveIntent(session?.payment_intent_id || order?.stripePaymentIntentId);
    const sameCart = session?.fingerprint === fingerprint
      && (!order || order.metadata.checkoutFingerprint === fingerprint)
      && isReusableIntent(intent);
    let replacedIntentId = null;
    if (!sameCart) {
      const paid = order?.status === 'succeeded' || intent?.status === 'succeeded';
      if (isInFlight(intent) && !paid) {
        throw conflict('Płatność została rozpoczęta. Poczekaj na jej wynik przed zmianą zamówienia.');
      }
      if (!paid) {
        await cancelUnusedIntent(intent);
        await cancelUnusedOrder(order);
      }
      replacedIntentId = intent?.id || null;
      order = null;
      intent = null;
    }
    if (discount && !discount.reusable) {
      const [busy] = await query(
        "SELECT id FROM orders WHERE rabat_code = ? AND status NOT IN ('canceled', 'succeeded') LIMIT 5",
        [discount.code],
      );
      if (busy.some(row => row.id !== order?.id)) {
        throw conflict('Ten kod rabatowy jest już używany w innym zamówieniu.');
      }
    }

    if (totals.total === 0) {
      if (discount?.percent !== 100) throw Object.assign(new Error('Zero amount requires a 100% discount code.'), { status: 400 });
      if (!order) {
        order = await persistOrder({
          totals, delivery, discount, customerEmail, shippingAddress, primaryProductId,
          primaryProductType, primarySku, hasPhysical, orderItems, fingerprint, clientIP, request, intentId: null,
        });
      }
      const { fulfillFreeOrder } = require('./paymentFulfillment');
      await fulfillFreeOrder(order.id);
      await saveSession(owner, { orderId: order.id, paymentIntentId: null, fingerprint });
      return {
        free: true, clientSecret: null, paymentIntentId: null, paymentStatus: 'succeeded',
        orderId: order.id, orderNumber: order.orderNumberDisplay || formatOrderNumber(order.orderNumber),
        productId: primaryProductId, amount: 0, shipping: 0, subtotal: totals.subtotal, items: order.items,
      };
    }

    if (!intent) {
      intent = await createDraftIntent({
        owner, fingerprint, customerEmail, amount: totals.total, currency: 'pln', replacementOf: replacedIntentId,
      });
    }
    assertDraftIntent(intent, { fingerprint, customerEmail, amount: totals.total, currency: 'pln' });
    await saveSession(owner, { orderId: order?.id || null, paymentIntentId: intent.id, fingerprint });

    if (wantsOrder(request, totals) && !order) {
      order = await persistOrder({
        totals, delivery, discount, customerEmail, shippingAddress, primaryProductId,
        primaryProductType, primarySku, hasPhysical, orderItems, fingerprint, clientIP, request, intentId: intent.id,
      });
      intent = await bindIntentToOrder(intent, { owner, fingerprint, customerEmail, order });
      await saveSession(owner, { orderId: order.id, paymentIntentId: intent.id, fingerprint });
    } else if (order) {
      if (intent.metadata?.orderId !== order.id) {
        intent = await bindIntentToOrder(intent, { owner, fingerprint, customerEmail, order });
      }
      if (request.acceptanceData?.termsAcceptedAt && order.stripePaymentIntentId) {
        await Payment.updatePayment(order.stripePaymentIntentId, {
          termsAcceptedAt: request.acceptanceData.termsAcceptedAt,
          privacyPolicyAcceptedAt: request.acceptanceData.privacyAcceptedAt || request.acceptanceData.termsAcceptedAt,
          clientIP: request.acceptanceData.clientIP || clientIP,
        });
      }
      await saveSession(owner, { orderId: order.id, paymentIntentId: intent.id, fingerprint });
    }

    if (order) assertCommittedIntent(intent, order);

    return {
      clientSecret: intent.client_secret, paymentIntentId: intent.id, paymentStatus: intent.status,
      orderId: order?.id || null, orderNumber: order ? (order.orderNumberDisplay || formatOrderNumber(order.orderNumber)) : null,
      productId: primaryProductId, amount: totals.total, shipping: totals.shipping,
      subtotal: totals.subtotal, items: order?.items || orderItems,
    };
  });
}

async function persistOrder({
  totals, delivery, discount, customerEmail, shippingAddress, primaryProductId,
  primaryProductType, primarySku, hasPhysical, orderItems, fingerprint, clientIP, request, intentId,
}) {
  return Payment.createPayment({
    amount: totals.total, shippingAmount: totals.shipping, amountNetto: totals.amountNetto,
    vatAmount: totals.vatAmount, shippingNetto: totals.shippingNetto, shippingVat: totals.shippingVat,
    vatRate: totals.vatRate, currency: 'pln', customerEmail, productId: primaryProductId,
    productType: primaryProductType, sku: primarySku, shippingAddress, hasPhysical, items: orderItems,
    rabat: discount?.code || null,
    stripePaymentIntentId: intentId,
    clientIP,
    termsAcceptedAt: request.acceptanceData?.termsAcceptedAt || null,
    privacyPolicyAcceptedAt: request.acceptanceData?.privacyAcceptedAt || null,
    metadata: { ...(delivery ? { inpostDelivery: delivery } : {}), ...(discount ? { discount } : {}),
      checkoutVersion: 2, checkoutFingerprint: fingerprint, clientIP,
      clientOrderId: String(request.orderId || '').slice(0, 200) },
  });
}

async function ensureIntent(order) {
  if (!formatOrderNumber(order.orderNumber)) throw new Error('Readable order number is missing');
  if (orderFingerprint(order) !== order.metadata.checkoutFingerprint) throw new Error('Saved order snapshot mismatch');
  let intent;
  if (order.stripePaymentIntentId) {
    intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
  } else {
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
  assertCommittedIntent(intent, order);
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

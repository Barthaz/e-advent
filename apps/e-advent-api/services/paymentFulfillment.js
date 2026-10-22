'use strict';

const { withTransaction } = require('../config/database');
const { isPhysicalProduct } = require('../config/products');
const { generateAccessCode } = require('./orderMailer');
const { orderFingerprint } = require('./orderIdentity');
const { redeem } = require('./discountCodes');

// Lock the order while validating its saved price and activating every calendar.
// A failed update rolls back the whole order; a repeated event keeps existing codes.
async function fulfillPaidIntent(intent) {
  return withTransaction(async conn => {
    const [orders] = await conn.execute('SELECT * FROM orders WHERE stripe_payment_intent_id = ? FOR UPDATE', [intent.id]);
    const order = orders[0];
    if (!order) throw new Error('Payment order not found');
    const metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : (order.metadata || {});
    const canonicalOrder = metadata.checkoutVersion === 2;
    const expectedId = canonicalOrder ? order.id : metadata.clientOrderId;
    if (!expectedId || intent.metadata?.orderId !== expectedId
        || intent.metadata?.customerEmail !== order.customer_email
        || (canonicalOrder && intent.metadata?.checkoutFingerprint !== metadata.checkoutFingerprint)) {
      throw new Error('Payment order/customer identity mismatch');
    }
    const cents = Math.round(Number(order.amount) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0 || intent.amount !== cents
        || intent.amount_received !== cents || intent.currency !== 'pln'
        || order.currency !== 'pln' || intent.status !== 'succeeded') {
      throw new Error('Payment amount, currency or status mismatch');
    }
    const [items] = await conn.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    if (!items.length) throw new Error('Payment has no saved order items');
    const itemCents = items.reduce((sum, item) => sum + Math.round(Number(item.unit_price) * 100) * Number(item.quantity), 0);
    const discountCents = Math.round(Number(metadata.discount?.amount || 0) * 100);
    if (itemCents + Math.round(Number(order.shipping_amount || 0) * 100) - discountCents !== cents) {
      throw new Error('Saved order items do not match the payment total');
    }
    // This durable job survives SMTP outages and application restarts.
    await conn.execute('INSERT IGNORE INTO order_email_jobs (order_id) VALUES (?)', [order.id]);
    if (order.status === 'succeeded') return { duplicate: true, orderId: order.id, rabatCode: order.rabat_code, email: order.customer_email };
    if (order.status === 'canceled') throw new Error('Canceled order cannot be fulfilled');
    if (canonicalOrder && orderFingerprint(order, items) !== metadata.checkoutFingerprint) {
      throw new Error('Saved order snapshot mismatch');
    }
    const hasPhysical = items.some(item => isPhysicalProduct(item.sku));
    for (const item of items) {
      const itemMetadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : (item.metadata || {});
      if (canonicalOrder && itemMetadata.calendarId && itemMetadata.calendarId !== item.calendar_id) {
        throw new Error('Order calendar identity mismatch');
      }
      if (!item.calendar_id) continue;
      const [calendars] = await conn.execute('SELECT id, access_code, email, sku, status FROM calendars WHERE id = ? FOR UPDATE', [item.calendar_id]);
      if (!calendars.length) throw new Error('Order calendar not found');
      const calendarEmail = String(calendars[0].email || '').trim().toLowerCase();
      const ownerEmail = String(itemMetadata.ownerEmail || '').trim().toLowerCase();
      if (canonicalOrder && (calendars[0].sku !== item.sku || calendars[0].status !== 'pending'
          || (ownerEmail && calendarEmail !== ownerEmail))) {
        throw new Error('Calendar owner, product or status mismatch');
      }
      const physical = isPhysicalProduct(item.sku);
      await conn.execute(
        "UPDATE calendars SET status = 'succeeded', access_code = ?, fulfillment_status = ? WHERE id = ?",
        [physical ? calendars[0].access_code : (calendars[0].access_code || generateAccessCode()), physical ? 'pending' : 'delivered', item.calendar_id],
      );
    }
    await conn.execute("UPDATE orders SET status = 'succeeded', fulfillment_status = ? WHERE id = ?",
      [hasPhysical ? 'pending' : 'delivered', order.id]);
    return { duplicate: false, orderId: order.id, rabatCode: order.rabat_code, email: order.customer_email };
  });
}

async function redeemOrderDiscount(orderId, code, email) {
  if (!code) return;
  try {
    await redeem(code, { orderId, email });
  } catch (error) {
    console.error('Discount redemption after payment:', orderId, error.message);
  }
}

async function fulfillFreeOrder(orderId) {
  const result = await withTransaction(async conn => {
    const [orders] = await conn.execute('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    const order = orders[0];
    if (!order) throw new Error('Payment order not found');
    const metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : (order.metadata || {});
    if (Number(order.amount) !== 0 || Number(metadata.discount?.percent) !== 100 || !order.rabat_code) {
      throw Object.assign(new Error('Darmowe zamówienie wymaga kodu 100%.'), { status: 400 });
    }
    await conn.execute('INSERT IGNORE INTO order_email_jobs (order_id) VALUES (?)', [order.id]);
    if (order.status === 'succeeded') return { duplicate: true, orderId: order.id, rabatCode: order.rabat_code, email: order.customer_email };
    if (order.status === 'canceled') throw new Error('Canceled order cannot be fulfilled');
    const [items] = await conn.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    if (!items.length) throw new Error('Payment has no saved order items');
    if (metadata.checkoutVersion === 2 && orderFingerprint(order, items) !== metadata.checkoutFingerprint) {
      throw new Error('Saved order snapshot mismatch');
    }
    await redeem(order.rabat_code, { orderId: order.id, email: order.customer_email });
    const hasPhysical = items.some(item => isPhysicalProduct(item.sku));
    for (const item of items) {
      const itemMetadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : (item.metadata || {});
      if (!item.calendar_id) continue;
      const [calendars] = await conn.execute('SELECT id, access_code, email, sku, status FROM calendars WHERE id = ? FOR UPDATE', [item.calendar_id]);
      if (!calendars.length) throw new Error('Order calendar not found');
      const physical = isPhysicalProduct(item.sku);
      await conn.execute(
        "UPDATE calendars SET status = 'succeeded', access_code = ?, fulfillment_status = ? WHERE id = ?",
        [physical ? calendars[0].access_code : (calendars[0].access_code || generateAccessCode()), physical ? 'pending' : 'delivered', item.calendar_id],
      );
    }
    await conn.execute("UPDATE orders SET status = 'succeeded', fulfillment_status = ? WHERE id = ?",
      [hasPhysical ? 'pending' : 'delivered', order.id]);
    return { duplicate: false, orderId: order.id };
  });
  return result;
}

module.exports = { fulfillPaidIntent, fulfillFreeOrder, redeemOrderDiscount };

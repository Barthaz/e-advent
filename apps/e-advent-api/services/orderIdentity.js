'use strict';
const { createHash } = require('node:crypto');
const parse = value => typeof value === 'string' ? JSON.parse(value) : (value || {});
const cents = value => Math.round(Number(value || 0) * 100);

// Hash exactly what is persisted, independently of MySQL row ordering and JSON
// key order. This detects swapped items/recipients even if totals still match.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function orderFingerprint(order, items = order.items) {
  const metadata = parse(order.metadata);
  const shipping = order.shippingAddress || ((order.shipping_street || metadata.inpostDelivery) ? {
    fullName: order.customer_name, phone: order.customer_phone, street: order.shipping_street,
    city: order.shipping_city, postalCode: order.shipping_postal_code,
  } : null);
  const delivery = metadata.inpostDelivery;
  const deliveryType = 'deliveryType' in order ? order.deliveryType : 'delivery_type' in order ? order.delivery_type : delivery?.type;
  const point = 'parcelLocker' in order ? order.parcelLocker : 'parcel_locker_id' in order
    ? (order.parcel_locker_id ? { id: order.parcel_locker_id, name: order.parcel_locker_name, address: order.parcel_locker_address } : null)
    : delivery?.point;
  const lines = items.map(item => {
    const metadata = parse(item.metadata);
    return JSON.stringify([
      item.sku, Number(item.quantity), cents(item.unitPrice ?? item.unit_price),
      item.calendarId || item.calendar_id || null, metadata.calendarId || null,
      metadata.ownerEmail || null, metadata.calendarTitle || null, metadata.childName || null,
    ]);
  }).sort();
  return createHash('sha256').update(JSON.stringify({
    customerEmail: order.customerEmail ?? order.customer_email,
    currency: order.currency, amount: cents(order.amount), shippingAmount: cents(order.shippingAmount ?? order.shipping_amount),
    shipping: shipping ? [shipping.fullName || `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim(),
      shipping.street || '', shipping.city || '', shipping.postalCode || '', shipping.phone] : null,
    ...(metadata.inpostDelivery ? { delivery: canonical(delivery), deliveryRecord: [deliveryType, point ? [point.id, point.name, point.address] : null] } : {}),
    lines,
  })).digest('hex');
}
module.exports = { orderFingerprint, canonical };

const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseShippingAddress(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof raw === 'object' ? raw : null;
}

function resolveDeliveryType(shippingAddress, hasPhysical) {
  if (shippingAddress && hasPhysical !== false) return 'poczta_polska';
  if (shippingAddress) return 'poczta_polska';
  return 'none';
}

function rowToPayment(row, items = []) {
  if (!row) return null;
  return {
    _id:                       row.id,
    id:                        row.id,
    stripePaymentIntentId:     row.stripe_payment_intent_id,
    amount:                    parseFloat(row.amount),
    shippingAmount:            row.shipping_amount != null ? parseFloat(row.shipping_amount) : 0,
    currency:                  row.currency,
    status:                    row.status,
    customerEmail:             row.customer_email,
    customerName:              row.customer_name,
    customerPhone:             row.customer_phone,
    productId:                 row.calendar_id,
    orderId:                   row.id,
    productType:               row.product_type,
    sku:                       row.sku,
    deliveryType:              row.delivery_type,
    shippingAddress: row.shipping_street ? {
      fullName:   row.customer_name,
      street:     row.shipping_street,
      city:       row.shipping_city,
      postalCode: row.shipping_postal_code,
      phone:      row.customer_phone,
    } : null,
    parcelLocker: row.parcel_locker_id ? {
      id:      row.parcel_locker_id,
      name:    row.parcel_locker_name,
      address: row.parcel_locker_address,
    } : null,
    trackingNumber:            row.tracking_number,
    fulfillmentStatus:         row.fulfillment_status,
    fulfillmentNotes:          row.fulfillment_notes,
    termsAcceptedAt:           row.terms_accepted_at,
    privacyPolicyAcceptedAt:   row.privacy_policy_accepted_at,
    clientIP:                  row.client_ip,
    rabat:                     row.rabat_code,
    items,
    metadata:                  typeof row.metadata === 'string'
                                 ? JSON.parse(row.metadata)
                                 : (row.metadata || {}),
    createdAt:                 row.created_at,
    updatedAt:                 row.updated_at,
  };
}

function itemRowToItem(row) {
  return {
    id:          row.id,
    orderId:     row.order_id,
    sku:         row.sku,
    productType: row.product_type,
    quantity:    row.quantity,
    unitPrice:   parseFloat(row.unit_price),
    calendarId:  row.calendar_id,
    metadata:    typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
  };
}

async function loadItemsForOrder(orderId) {
  try {
    const [rows] = await query(
      'SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC',
      [orderId]
    );
    return rows.map(itemRowToItem);
  } catch {
    return [];
  }
}

async function loadPaymentWithItems(row) {
  if (!row) return null;
  const items = await loadItemsForOrder(row.id);
  return rowToPayment(row, items);
}

async function insertOrderItems(orderId, items) {
  if (!Array.isArray(items) || items.length === 0) return;
  for (const item of items) {
    await query(
      `INSERT INTO order_items
         (id, order_id, sku, product_type, quantity, unit_price, calendar_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        orderId,
        item.sku,
        item.productType || item.product_type || 'interactive',
        item.quantity || 1,
        item.unitPrice ?? item.unit_price ?? 0,
        item.calendarId || item.calendar_id || null,
        item.metadata ? JSON.stringify(item.metadata) : null,
      ]
    );
  }
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

const createPayment = async (paymentData) => {
  const id         = uuidv4();
  const calendarId = paymentData.productId || paymentData.calendar_id || null;
  const sa         = parseShippingAddress(
    paymentData.shippingAddress || paymentData.metadata?.shippingAddress || null
  );
  const productType = paymentData.productType || 'interactive';
  const items = paymentData.items || [];
  const hasPhysical = items.some((i) => i.requiresShipping)
    || paymentData.hasPhysical === true
    || ['scratch', 'letter'].includes(productType);

  console.log(`Creating payment for calendar ${calendarId}, orderId ${paymentData.orderId || id}`);

  await query(
    `INSERT INTO orders
       (id, calendar_id, stripe_payment_intent_id, amount, shipping_amount, currency, status,
        customer_email, customer_name, customer_phone,
        delivery_type, shipping_street, shipping_city, shipping_postal_code,
        product_type, sku, fulfillment_status, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      calendarId,
      paymentData.stripePaymentIntentId  || null,
      paymentData.amount                 || 0,
      paymentData.shippingAmount         || 0,
      paymentData.currency               || 'pln',
      paymentData.status                 || 'pending',
      paymentData.customerEmail          || '',
      sa?.fullName                       || null,
      sa?.phone                          || null,
      resolveDeliveryType(sa, hasPhysical),
      sa?.street                         || null,
      sa?.city                           || null,
      sa?.postalCode                     || null,
      productType,
      paymentData.sku                    || 'interactive',
      paymentData.fulfillmentStatus      || 'pending',
      paymentData.metadata ? JSON.stringify(paymentData.metadata) : null,
    ]
  );

  if (items.length > 0) {
    await insertOrderItems(id, items);
  } else if (calendarId || paymentData.sku) {
    await insertOrderItems(id, [{
      sku: paymentData.sku || 'interactive',
      productType,
      quantity: 1,
      unitPrice: paymentData.unitPrice ?? paymentData.amount ?? 0,
      calendarId,
    }]);
  }

  console.log(`Payment created with ID ${id}`);
  const [rows] = await query('SELECT * FROM orders WHERE id = ?', [id]);
  return loadPaymentWithItems(rows[0]);
};

const findPaymentByStripeId = async (stripePaymentIntentId) => {
  const [rows] = await query(
    'SELECT * FROM orders WHERE stripe_payment_intent_id = ?',
    [stripePaymentIntentId]
  );
  return loadPaymentWithItems(rows[0] || null);
};

const findPaymentById = async (id) => {
  const [rows] = await query('SELECT * FROM orders WHERE id = ?', [String(id)]);
  return loadPaymentWithItems(rows[0] || null);
};

const updatePaymentStatus = async (stripePaymentIntentId, status) => {
  await query(
    'UPDATE orders SET status = ? WHERE stripe_payment_intent_id = ?',
    [status, stripePaymentIntentId]
  );
  return findPaymentByStripeId(stripePaymentIntentId);
};

const FIELD_MAP = {
  stripePaymentIntentId:    'stripe_payment_intent_id',
  amount:                   'amount',
  shippingAmount:           'shipping_amount',
  currency:                 'currency',
  status:                   'status',
  customerEmail:            'customer_email',
  customerName:             'customer_name',
  customerPhone:            'customer_phone',
  deliveryType:             'delivery_type',
  shippingStreet:           'shipping_street',
  shippingCity:             'shipping_city',
  shippingPostalCode:       'shipping_postal_code',
  parcelLockerId:           'parcel_locker_id',
  parcelLockerName:         'parcel_locker_name',
  parcelLockerAddress:      'parcel_locker_address',
  trackingNumber:           'tracking_number',
  termsAcceptedAt:          'terms_accepted_at',
  privacyPolicyAcceptedAt:  'privacy_policy_accepted_at',
  clientIP:                 'client_ip',
  rabat:                    'rabat_code',
  productType:              'product_type',
  sku:                      'sku',
  fulfillmentStatus:        'fulfillment_status',
  fulfillmentNotes:         'fulfillment_notes',
  metadata:                 'metadata',
  calendar_id:              'calendar_id',
  productId:                'calendar_id',
};

const updatePayment = async (stripePaymentIntentId, updateData) => {
  const data = { ...updateData };

  if ('shippingAddress' in data) {
    const sa = parseShippingAddress(data.shippingAddress);
    delete data.shippingAddress;
    if (sa) {
      if (sa.fullName != null) data.customerName = sa.fullName;
      if (sa.phone != null) data.customerPhone = sa.phone;
      if (sa.street != null) data.shippingStreet = sa.street;
      if (sa.city != null) data.shippingCity = sa.city;
      if (sa.postalCode != null) data.shippingPostalCode = sa.postalCode;
      data.deliveryType = data.deliveryType || 'poczta_polska';
    }
  }

  const sets   = [];
  const values = [];

  for (const [key, val] of Object.entries(data)) {
    const col = FIELD_MAP[key];
    if (!col) continue;
    sets.push(`${col} = ?`);
    values.push(col === 'metadata' ? JSON.stringify(val) : val);
  }

  if (sets.length === 0) {
    return findPaymentByStripeId(stripePaymentIntentId);
  }

  values.push(stripePaymentIntentId);
  await query(
    `UPDATE orders SET ${sets.join(', ')} WHERE stripe_payment_intent_id = ?`,
    values
  );
  return findPaymentByStripeId(stripePaymentIntentId);
};

const updatePaymentByProductId = async (productId, updateData) => {
  const data = { ...updateData };

  if ('shippingAddress' in data) {
    const sa = parseShippingAddress(data.shippingAddress);
    delete data.shippingAddress;
    if (sa) {
      if (sa.fullName != null) data.customerName = sa.fullName;
      if (sa.phone != null) data.customerPhone = sa.phone;
      if (sa.street != null) data.shippingStreet = sa.street;
      if (sa.city != null) data.shippingCity = sa.city;
      if (sa.postalCode != null) data.shippingPostalCode = sa.postalCode;
      data.deliveryType = data.deliveryType || 'poczta_polska';
    }
  }

  const sets   = [];
  const values = [];

  for (const [key, val] of Object.entries(data)) {
    const col = FIELD_MAP[key];
    if (!col) continue;
    sets.push(`${col} = ?`);
    values.push(col === 'metadata' ? JSON.stringify(val) : val);
  }

  if (sets.length === 0) {
    const [rows] = await query('SELECT * FROM orders WHERE calendar_id = ? LIMIT 1', [productId]);
    return loadPaymentWithItems(rows[0] || null);
  }

  values.push(productId);
  await query(
    `UPDATE orders SET ${sets.join(', ')} WHERE calendar_id = ?`,
    values
  );
  const [rows] = await query('SELECT * FROM orders WHERE calendar_id = ? LIMIT 1', [productId]);
  return loadPaymentWithItems(rows[0] || null);
};

const findPayments = async (filter = {}, options = {}) => {
  let sql    = 'SELECT * FROM orders WHERE 1=1';
  const vals = [];

  if (filter.productId || filter.calendar_id) {
    sql += ' AND (calendar_id = ? OR id IN (SELECT order_id FROM order_items WHERE calendar_id = ?))';
    vals.push(filter.productId || filter.calendar_id, filter.productId || filter.calendar_id);
  }
  if (filter.status) {
    sql += ' AND status = ?';
    vals.push(filter.status);
  }
  if (filter.customerEmail) {
    sql += ' AND customer_email = ?';
    vals.push(filter.customerEmail);
  }

  sql += ' ORDER BY created_at DESC';

  if (options.limit) { sql += ' LIMIT ?';  vals.push(options.limit);  }
  if (options.skip)  { sql += ' OFFSET ?'; vals.push(options.skip);   }

  const [rows] = await query(sql, vals);
  const results = [];
  for (const row of rows) {
    results.push(await loadPaymentWithItems(row));
  }
  return results;
};

const replaceOrderItems = async (orderId, items) => {
  await query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
  await insertOrderItems(orderId, items);
};

module.exports = {
  createPayment,
  findPaymentByStripeId,
  findPaymentById,
  updatePaymentStatus,
  updatePayment,
  updatePaymentByProductId,
  findPayments,
  replaceOrderItems,
  loadItemsForOrder,
  parseShippingAddress,
};

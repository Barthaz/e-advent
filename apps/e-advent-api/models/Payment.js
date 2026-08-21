const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { formatOrderNumber } = require('../utils/orderNumber');
const { DEFAULT_VAT_RATE, splitGrossAmount, roundPln } = require('../config/products');

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

function resolveShippingCustomerName(sa) {
  if (!sa) return null;
  const composed = String(sa.fullName || `${sa.firstName || ''} ${sa.lastName || ''}`).trim();
  return composed || null;
}

function resolveDeliveryType(shippingAddress, hasPhysical) {
  if (shippingAddress && hasPhysical !== false) return 'poczta_polska';
  if (shippingAddress) return 'poczta_polska';
  return 'none';
}

function resolveItemVatFields(item) {
  const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
  const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0) || 0;
  const vatRate = Number(item.vatRate ?? item.vat_rate ?? DEFAULT_VAT_RATE) || DEFAULT_VAT_RATE;
  const lineBrutto = item.lineBrutto != null || item.line_brutto != null
    ? Number(item.lineBrutto ?? item.line_brutto)
    : roundPln(unitPrice * quantity);
  const unitSplit = splitGrossAmount(unitPrice, vatRate);
  const lineSplit = splitGrossAmount(lineBrutto, vatRate);
  return {
    quantity,
    unitPrice,
    vatRate,
    unitPriceNetto: item.unitPriceNetto ?? item.unit_price_netto ?? unitSplit.netto,
    lineNetto: item.lineNetto ?? item.line_netto ?? lineSplit.netto,
    lineVat: item.lineVat ?? item.line_vat ?? lineSplit.vat,
    lineBrutto: lineSplit.brutto,
  };
}

function rowToPayment(row, items = []) {
  if (!row) return null;
  const orderNumber = row.order_number != null ? Number(row.order_number) : null;
  return {
    _id:                       row.id,
    id:                        row.id,
    orderNumber,
    orderNumberDisplay:        formatOrderNumber(orderNumber),
    stripePaymentIntentId:     row.stripe_payment_intent_id,
    amount:                    parseFloat(row.amount),
    shippingAmount:            row.shipping_amount != null ? parseFloat(row.shipping_amount) : 0,
    amountNetto:               row.amount_netto != null ? parseFloat(row.amount_netto) : 0,
    vatAmount:                 row.vat_amount != null ? parseFloat(row.vat_amount) : 0,
    shippingNetto:             row.shipping_netto != null ? parseFloat(row.shipping_netto) : 0,
    shippingVat:               row.shipping_vat != null ? parseFloat(row.shipping_vat) : 0,
    vatRate:                   row.vat_rate != null ? parseFloat(row.vat_rate) : DEFAULT_VAT_RATE,
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
    id:             row.id,
    orderId:        row.order_id,
    sku:            row.sku,
    productType:    row.product_type,
    quantity:       row.quantity,
    unitPrice:      parseFloat(row.unit_price),
    vatRate:        row.vat_rate != null ? parseFloat(row.vat_rate) : DEFAULT_VAT_RATE,
    unitPriceNetto: row.unit_price_netto != null ? parseFloat(row.unit_price_netto) : 0,
    lineNetto:      row.line_netto != null ? parseFloat(row.line_netto) : 0,
    lineVat:        row.line_vat != null ? parseFloat(row.line_vat) : 0,
    lineBrutto:     row.line_brutto != null ? parseFloat(row.line_brutto) : parseFloat(row.unit_price) * row.quantity,
    calendarId:     row.calendar_id,
    metadata:       typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
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
    const vat = resolveItemVatFields(item);
    await query(
      `INSERT INTO order_items
         (id, order_id, sku, product_type, quantity, unit_price,
          vat_rate, unit_price_netto, line_netto, line_vat, line_brutto,
          calendar_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        orderId,
        item.sku,
        item.productType || item.product_type || 'interactive',
        vat.quantity,
        vat.unitPrice,
        vat.vatRate,
        vat.unitPriceNetto,
        vat.lineNetto,
        vat.lineVat,
        vat.lineBrutto,
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

  const shippingAmount = paymentData.shippingAmount || 0;
  const vatRate = paymentData.vatRate ?? DEFAULT_VAT_RATE;
  const shippingSplit = splitGrossAmount(shippingAmount, vatRate);
  const amountNetto = paymentData.amountNetto != null
    ? paymentData.amountNetto
    : splitGrossAmount(paymentData.amount || 0, vatRate).netto;
  const vatAmount = paymentData.vatAmount != null
    ? paymentData.vatAmount
    : splitGrossAmount(paymentData.amount || 0, vatRate).vat;
  const shippingNetto = paymentData.shippingNetto != null
    ? paymentData.shippingNetto
    : shippingSplit.netto;
  const shippingVat = paymentData.shippingVat != null
    ? paymentData.shippingVat
    : shippingSplit.vat;

  console.log(`Creating payment for calendar ${calendarId}, orderId ${paymentData.orderId || id}`);

  await query(
    `INSERT INTO orders
       (id, calendar_id, stripe_payment_intent_id, amount, shipping_amount,
        amount_netto, vat_amount, shipping_netto, shipping_vat, vat_rate,
        currency, status,
        customer_email, customer_name, customer_phone,
        delivery_type, shipping_street, shipping_city, shipping_postal_code,
        product_type, sku, fulfillment_status, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      calendarId,
      paymentData.stripePaymentIntentId  || null,
      paymentData.amount                 || 0,
      shippingAmount,
      amountNetto,
      vatAmount,
      shippingNetto,
      shippingVat,
      vatRate,
      paymentData.currency               || 'pln',
      paymentData.status                 || 'pending',
      paymentData.customerEmail          || '',
      resolveShippingCustomerName(sa),

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

const findPaymentByOrderNumber = async (orderNumber) => {
  const n = typeof orderNumber === 'number' ? orderNumber : parseInt(String(orderNumber), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  const [rows] = await query('SELECT * FROM orders WHERE order_number = ?', [n]);
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
  amountNetto:              'amount_netto',
  vatAmount:                'vat_amount',
  shippingNetto:            'shipping_netto',
  shippingVat:              'shipping_vat',
  vatRate:                  'vat_rate',
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
      const name = resolveShippingCustomerName(sa);
      if (name != null) data.customerName = name;
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
      const name = resolveShippingCustomerName(sa);
      if (name != null) data.customerName = name;
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
  findPaymentByOrderNumber,
  updatePaymentStatus,
  updatePayment,
  updatePaymentByProductId,
  findPayments,
  replaceOrderItems,
  loadItemsForOrder,
  parseShippingAddress,
};

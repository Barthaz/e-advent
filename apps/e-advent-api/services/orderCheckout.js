const Calendar = require('../models/Calendar');
const {
  getProduct,
  computeOrderTotals,
  isPhysicalProduct,
} = require('../config/products');

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

function isCompleteShippingAddress(sa) {
  if (!sa) return false;
  return Boolean(
    sa.fullName &&
    sa.street &&
    sa.city &&
    sa.postalCode &&
    sa.phone
  );
}

/**
 * Normalize client payload into authoritative line items.
 * Supports legacy { productId } and cart { items: [{ sku?, calendarId?, quantity? }] }.
 */
async function resolveCheckoutItems(requestData) {
  const errors = [];
  let rawItems = Array.isArray(requestData.items) ? requestData.items : null;

  // Legacy single-calendar checkout
  if ((!rawItems || rawItems.length === 0) && requestData.productId) {
    rawItems = [{ calendarId: requestData.productId, quantity: 1 }];
  }

  if (!rawItems || rawItems.length === 0) {
    return {
      errors: [{
        type: 'field',
        msg: 'Items array or productId is required',
        path: 'items',
        location: 'body',
      }],
    };
  }

  const resolved = [];

  for (let i = 0; i < rawItems.length; i++) {
    const raw = rawItems[i] || {};
    const quantity = Math.max(1, parseInt(raw.quantity, 10) || 1);
    const calendarId = raw.calendarId || raw.productId || null;
    let clientSku = raw.sku || null;

    if (calendarId) {
      let calendar;
      try {
        calendar = await Calendar.findCalendarById(calendarId);
      } catch (err) {
        errors.push({
          type: 'field',
          msg: `Invalid calendar ID at items[${i}]`,
          path: `items[${i}].calendarId`,
          location: 'body',
        });
        continue;
      }

      if (!calendar) {
        errors.push({
          type: 'field',
          msg: `Calendar not found: ${calendarId}`,
          path: `items[${i}].calendarId`,
          location: 'body',
        });
        continue;
      }

      if (calendar.status !== 'pending') {
        errors.push({
          type: 'field',
          msg: `Calendar has status '${calendar.status}'. Payment intent only for pending calendars.`,
          path: `items[${i}].calendarId`,
          location: 'body',
          currentStatus: calendar.status,
        });
        continue;
      }

      const data = calendar.data || {};
      const sku = data.sku || 'interactive';
      const product = getProduct(sku);
      if (!product) {
        errors.push({
          type: 'field',
          msg: `Unknown product SKU on calendar: ${sku}`,
          path: 'sku',
          location: 'body',
        });
        continue;
      }

      resolved.push({
        sku,
        productType: data.productType || product.type,
        quantity,
        unitPrice: product.basePrice,
        calendarId,
        calendar,
        requiresShipping: product.requiresShipping,
      });
      continue;
    }

    // Non-calendar products (e.g. santa-letter)
    if (!clientSku) {
      errors.push({
        type: 'field',
        msg: `SKU or calendarId required at items[${i}]`,
        path: `items[${i}]`,
        location: 'body',
      });
      continue;
    }

    const product = getProduct(clientSku);
    if (!product) {
      errors.push({
        type: 'field',
        msg: `Unknown product SKU: ${clientSku}`,
        path: `items[${i}].sku`,
        location: 'body',
      });
      continue;
    }

    if (product.type !== 'letter' && product.requiresDesign) {
      errors.push({
        type: 'field',
        msg: `Product ${clientSku} requires a calendar/design — provide calendarId`,
        path: `items[${i}].calendarId`,
        location: 'body',
      });
      continue;
    }

    resolved.push({
      sku: product.sku,
      productType: product.type,
      quantity,
      unitPrice: product.basePrice,
      calendarId: null,
      calendar: null,
      requiresShipping: product.requiresShipping,
    });
  }

  if (errors.length > 0) {
    return { errors };
  }

  const totals = computeOrderTotals(resolved.map((r) => ({ sku: r.sku, quantity: r.quantity })));
  if (!totals) {
    return {
      errors: [{
        type: 'field',
        msg: 'Unable to compute order totals',
        path: 'items',
        location: 'body',
      }],
    };
  }

  const shippingAddress = parseShippingAddress(
    requestData.shippingAddress
    || requestData.metadata?.shippingAddress
    || null
  );

  if (totals.hasPhysical && !isCompleteShippingAddress(shippingAddress)) {
    return {
      errors: [{
        type: 'field',
        msg: 'Complete shipping address is required for physical products',
        path: 'shippingAddress',
        location: 'body',
      }],
    };
  }

  const primary = resolved[0];
  return {
    items: resolved,
    totals,
    shippingAddress: totals.hasPhysical ? shippingAddress : null,
    primaryProductId: primary?.calendarId || null,
    primarySku: primary?.sku || null,
    primaryProductType: primary?.productType || null,
    hasPhysical: totals.hasPhysical,
  };
}

function orderHasPhysicalFromPayment(payment) {
  if (payment?.items?.length) {
    return payment.items.some((i) => isPhysicalProduct(i.sku));
  }
  return isPhysicalProduct(payment?.sku || '');
}

module.exports = {
  resolveCheckoutItems,
  parseShippingAddress,
  isCompleteShippingAddress,
  orderHasPhysicalFromPayment,
};

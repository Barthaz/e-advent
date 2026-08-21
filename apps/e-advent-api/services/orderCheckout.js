const Calendar = require('../models/Calendar');
const {
  getProduct,
  computeOrderTotals,
  isPhysicalProduct,
  isLetterAddonSku,
  SANTA_LETTER_SKU,
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

    if (isLetterAddonSku(product.sku)) {
      const childName = String(raw.metadata?.childName ?? raw.childName ?? '').trim();
      if (!childName || childName.length < 2) {
        errors.push({
          type: 'field',
          msg: 'Imię dziecka jest wymagane dla certyfikatu (min. 2 znaki)',
          path: `items[${i}].metadata.childName`,
          location: 'body',
        });
        continue;
      }
      if (quantity !== 1) {
        errors.push({
          type: 'field',
          msg: 'Certyfikat musi być zamówiony pojedynczo — każde dziecko to osobna pozycja',
          path: `items[${i}].quantity`,
          location: 'body',
        });
        continue;
      }
      resolved.push({
        sku: product.sku,
        productType: product.type,
        quantity: 1,
        unitPrice: product.basePrice,
        calendarId: null,
        calendar: null,
        requiresShipping: product.requiresShipping,
        metadata: { childName },
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

  const letterCount = resolved
    .filter((r) => r.sku === SANTA_LETTER_SKU)
    .reduce((sum, r) => sum + r.quantity, 0);
  const certificateCount = resolved
    .filter((r) => isLetterAddonSku(r.sku))
    .reduce((sum, r) => sum + r.quantity, 0);

  if (certificateCount > 0 && letterCount === 0) {
    return {
      errors: [{
        type: 'field',
        msg: 'Certyfikat Grzecznego Dziecka można zamówić wyłącznie razem z Listem do Świętego Mikołaja',
        path: 'items',
        location: 'body',
      }],
    };
  }

  if (certificateCount > letterCount) {
    return {
      errors: [{
        type: 'field',
        msg: 'Liczba certyfikatów nie może przekraczać liczby listów do Mikołaja w zamówieniu',
        path: 'items',
        location: 'body',
      }],
    };
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

  const primary = resolved.find((r) => r.sku === SANTA_LETTER_SKU)
    || resolved.find((r) => r.calendarId)
    || resolved[0];
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

const { resolveDelivery } = require('./inpost');
const Calendar = require('../models/Calendar');
const {
  getProduct,
  computeOrderTotals,
  isPhysicalProduct,
  isLetterAddonSku,
  SANTA_LETTER_SKU,
} = require('../config/products');
const { findByCode, isAvailable, applyToTotals } = require('./discountCodes');

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
  const fullName = String(sa.fullName || `${sa.firstName || ''} ${sa.lastName || ''}`).trim();
  return Boolean(
    fullName &&
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
  const seenCalendars = new Set();

  for (let i = 0; i < rawItems.length; i++) {
    const raw = rawItems[i] || {};
    const quantity = raw.quantity == null ? 1 : Number(raw.quantity);
    const calendarId = raw.calendarId || raw.productId || null;
    let clientSku = raw.sku || null;

    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
      errors.push({ type: 'field', msg: 'Quantity must be an integer from 1 to 100', path: `items[${i}].quantity`, location: 'body' });
      continue;
    }
    if (calendarId && seenCalendars.has(calendarId)) {
      errors.push({ type: 'field', msg: 'A calendar may occur only once in an order', path: `items[${i}].calendarId`, location: 'body' });
      continue;
    }
    if (calendarId) seenCalendars.add(calendarId);

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

      if (!Calendar.verifyEditToken(calendar, raw.editToken || requestData.editToken)) {
        errors.push({ type: 'field', msg: 'Valid calendar edit token is required', path: 'editToken', location: 'body' });
        continue;
      }
      const data = calendar.data || {};
      const sku = data.sku || 'interactive';
      const product = getProduct(sku);
      // Interactive calendars need an owner email for access. Physical scratch
      // orders collect the buyer email at checkout, so the calendar may omit it.
      if (!isPhysicalProduct(sku) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email || '').trim())) {
        errors.push({ type: 'field', msg: 'Calendar owner email is required for delivery', path: `items[${i}].calendarId`, location: 'body' });
        continue;
      }
      if (product?.discontinued || (product?.type === 'scratch' && data.format && data.format !== 'A3')) {
        errors.push({ type: 'field', msg: 'Kalendarz zdrapka jest dostępny wyłącznie w formacie A3. Utwórz go ponownie w kreatorze.', path: `items[${i}].calendarId`, location: 'body' });
        continue;
      }
      if (!product) {
        errors.push({
          type: 'field',
          msg: `Unknown product SKU on calendar: ${sku}`,
          path: 'sku',
          location: 'body',
        });
        continue;
      }

      if (!isPhysicalProduct(sku) && quantity !== 1) {
        errors.push({ type: 'field', msg: 'An interactive calendar requires quantity 1', path: `items[${i}].quantity`, location: 'body' });
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
    if (product?.discontinued) {
      errors.push({ type: 'field', msg: 'Ten wariant został wycofany. Kalendarz zdrapka jest dostępny w formacie A3.', path: `items[${i}].sku`, location: 'body' });
      continue;
    }
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

  let totals = computeOrderTotals(resolved.map((r) => ({ sku: r.sku, quantity: r.quantity })));
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

  const rawShipping = parseShippingAddress(
    requestData.shippingAddress
    || requestData.metadata?.shippingAddress
    || null
  );
  let shippingAddress = rawShipping ? {
    fullName: String(rawShipping.fullName || `${rawShipping.firstName || ''} ${rawShipping.lastName || ''}`).trim(),
    street: String(rawShipping.street || '').trim(), city: String(rawShipping.city || '').trim(),
    postalCode: String(rawShipping.postalCode || '').trim(), phone: String(rawShipping.phone || '').trim(),
  } : null;

  let delivery = null;
  if (totals.hasPhysical) {
    delivery = await resolveDelivery(resolved, requestData.delivery, rawShipping, requestData.customerEmail);
    const a = delivery.receiver.address;
    shippingAddress = {
      fullName: delivery.receiver.first_name + ' ' + delivery.receiver.last_name,
      phone: delivery.receiver.phone,
      street: a ? a.street + ' ' + a.building_number + (a.flat_number ? '/' + a.flat_number : '') : '',
      city: a?.city || '', postalCode: a?.post_code || '',
    };
    totals = computeOrderTotals(resolved, { shippingAmount: delivery.price });
  }

  let discount = null;
  if (requestData.promoCode) {
    const row = await findByCode(requestData.promoCode);
    if (!isAvailable(row)) {
      return {
        errors: [{
          type: 'field',
          msg: 'Kod rabatowy jest nieprawidłowy albo został już wykorzystany.',
          path: 'promoCode',
          location: 'body',
        }],
      };
    }
    totals = applyToTotals(totals, row);
    if (!totals) {
      return {
        errors: [{
          type: 'field',
          msg: 'Nie udało się zastosować kodu rabatowego.',
          path: 'promoCode',
          location: 'body',
        }],
      };
    }
    discount = {
      code: row.code,
      percent: Number(row.percent),
      amount: totals.discount,
      reusable: Boolean(Number(row.reusable)),
    };
  }

  const primary = resolved.find((r) => r.sku === SANTA_LETTER_SKU)
    || resolved.find((r) => r.calendarId)
    || resolved[0];
  return {
    items: resolved,
    delivery,
    totals,
    shippingAddress: totals.hasPhysical ? shippingAddress : null,
    primaryProductId: primary?.calendarId || null,
    primarySku: primary?.sku || null,
    primaryProductType: primary?.productType || null,
    hasPhysical: totals.hasPhysical,
    discount,
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

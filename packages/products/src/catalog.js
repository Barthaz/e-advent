export const SHIPPING_COST = 5;
export const FREE_SHIPPING_THRESHOLD = 100;

/** Standardowa stawka VAT dla towarów/usług w PL (ceny katalogowe są brutto). */
export const DEFAULT_VAT_RATE = 23;

/** Zaokrąglenie do 1 grosza (PLN). */
export function roundPln(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

/**
 * Rozbicie kwoty brutto (VAT w cenie) na netto + VAT — metoda zgodna z praktyką PL:
 * netto = round(brutto / (1 + stawka/100)), VAT = brutto − netto (w groszach).
 *
 * @param {number} grossBrutto
 * @param {number} [vatRate=DEFAULT_VAT_RATE]
 * @returns {{ brutto: number, netto: number, vat: number, vatRate: number }}
 */
export function splitGrossAmount(grossBrutto, vatRate = DEFAULT_VAT_RATE) {
  const rate = Number(vatRate);
  const bruttoGrosze = Math.round(Number(grossBrutto) * 100);
  if (!Number.isFinite(bruttoGrosze) || bruttoGrosze === 0) {
    return { brutto: 0, netto: 0, vat: 0, vatRate: rate };
  }
  const nettoGrosze = Math.round(bruttoGrosze / (1 + rate / 100));
  const vatGrosze = bruttoGrosze - nettoGrosze;
  return {
    brutto: bruttoGrosze / 100,
    netto: nettoGrosze / 100,
    vat: vatGrosze / 100,
    vatRate: rate,
  };
}

export const PRODUCTS = {
  interactive: {
    sku: 'interactive',
    type: 'interactive',
    slug: 'interaktywny',
    name: 'Kalendarz interaktywny',
    description: 'Spersonalizowany kalendarz adwentowy online z codziennym odkrywaniem zadań.',
    basePrice: 9,
    shippingCost: 0,
    format: null,
    requiresShipping: false,
    requiresDesign: false,
    creatorRoute: '/stworz-kalendarz/interaktywny',
  },
  'scratch-a4': {
    sku: 'scratch-a4',
    discontinued: true, // Historical orders only; unavailable for new checkout.
    type: 'scratch',
    slug: 'zdrapka',
    name: 'Kalendarz zdrapka A4',
    description: 'Fizyczny kalendarz adwentowy ze zdrapkami w formacie A4.',
    basePrice: 49,
    shippingCost: SHIPPING_COST,
    format: 'A4',
    requiresShipping: true,
    requiresDesign: true,
    creatorRoute: '/stworz-kalendarz/zdrapka',
  },
  'scratch-a3': {
    sku: 'scratch-a3',
    type: 'scratch',
    slug: 'zdrapka',
    name: 'Kalendarz zdrapka A3',
    description: 'Fizyczny kalendarz adwentowy A3 ze złotymi zdrapkami — 3 warianty i gotowa przygoda albo własne zadania.',
    basePrice: 69,
    shippingCost: SHIPPING_COST,
    format: 'A3',
    requiresShipping: true,
    requiresDesign: true,
    creatorRoute: '/stworz-kalendarz/zdrapka',
  },
  'santa-letter': {
    sku: 'santa-letter',
    type: 'letter',
    slug: 'list-do-swietego-mikolaja',
    name: 'List do Świętego Mikołaja',
    description: 'Gotowy zestaw: 2 wersje listu, opisana koperta i naklejki świąteczne.',
    basePrice: 29,
    shippingCost: SHIPPING_COST,
    format: null,
    requiresShipping: true,
    requiresDesign: false,
    creatorRoute: '/list-do-swietego-mikolaja',
  },
  'santa-certificate': {
    sku: 'santa-certificate',
    type: 'letter',
    slug: 'list-do-swietego-mikolaja',
    name: 'Certyfikat Grzecznego Dziecka',
    description: 'Oficjalny certyfikat od Świętego Mikołaja z imieniem dziecka — dodatek do listu.',
    basePrice: 9,
    shippingCost: 0,
    format: null,
    requiresShipping: false,
    requiresDesign: false,
    letterAddonOnly: true,
    creatorRoute: '/list-do-swietego-mikolaja',
  },
};

export const PRODUCT_FAMILIES = [
  {
    type: 'letter',
    slug: 'list-do-swietego-mikolaja',
    name: 'List do Świętego Mikołaja',
    shortDescription: 'Gotowy zestaw do wysyłki — 2 listy, koperta i naklejki.',
    icon: 'fa-envelope',
    creatorRoute: '/list-do-swietego-mikolaja',
    priceFrom: 29,
    features: ['2 wersje listu', 'Opisana koperta', 'Naklejki świąteczne', 'Wysyłka InPost'],
    requiresShipping: true,
    requiresDesign: false,
  },
  {
    type: 'interactive',
    slug: 'interaktywny',
    name: 'Kalendarz interaktywny',
    shortDescription: 'Natychmiastowy dostęp online — otwieraj okienka codziennie w grudniu.',
    icon: 'fa-laptop',
    creatorRoute: '/stworz-kalendarz/interaktywny',
    priceFrom: 9,
    features: ['Dostęp online 24/7', 'Własne zadania', 'Link na e-mail'],
    requiresShipping: false,
    requiresDesign: false,
  },
  {
    type: 'scratch',
    slug: 'zdrapka',
    name: 'Kalendarz zdrapka',
    shortDescription: 'Fizyczny kalendarz A3 — zdrapuj złote okienko każdego dnia i odkryj zadanie.',
    icon: 'fa-hand-sparkles',
    creatorRoute: '/stworz-kalendarz/zdrapka',
    priceFrom: 69,
    features: ['Format A3 (29,7 × 42 cm)', '3 warianty', 'Gotowa przygoda lub własne zadania', 'Wysyłka InPost'],
    requiresShipping: true,
    requiresDesign: true,
  },
];

export function getProduct(sku) {
  return PRODUCTS[sku] || null;
}

export function isPhysicalProduct(sku) {
  const product = getProduct(sku);
  return product ? product.requiresShipping : false;
}

/**
 * @param {Array<{ sku: string, quantity?: number }>} items
 * @param {{ vatRate?: number }} [options]
 * @returns {import('./index').OrderTotals | null}
 */
export function computeOrderTotals(items, options = {}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const vatRate = options.vatRate != null ? Number(options.vatRate) : DEFAULT_VAT_RATE;
  let subtotal = 0;
  let hasPhysical = false;
  const lines = [];

  for (const item of items) {
    const product = getProduct(item.sku);
    if (!product) return null;
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const lineBrutto = roundPln(product.basePrice * qty);
    const unitSplit = splitGrossAmount(product.basePrice, vatRate);
    const lineSplit = splitGrossAmount(lineBrutto, vatRate);
    subtotal = roundPln(subtotal + lineBrutto);
    if (product.requiresShipping) hasPhysical = true;
    lines.push({
      sku: product.sku,
      quantity: qty,
      vatRate,
      unitPrice: product.basePrice,
      unitPriceNetto: unitSplit.netto,
      lineBrutto: lineSplit.brutto,
      lineNetto: lineSplit.netto,
      lineVat: lineSplit.vat,
    });
  }

  let shipping = 0;
  let freeShipping = false;
  if (hasPhysical) {
    if (subtotal >= FREE_SHIPPING_THRESHOLD) {
      shipping = 0;
      freeShipping = true;
    } else if (options?.shippingAmount != null) {
      shipping = roundPln(options.shippingAmount);
      if (!Number.isFinite(shipping) || shipping < 0) return null;
    } else {
      shipping = SHIPPING_COST;
    }
  }

  const shippingSplit = splitGrossAmount(shipping, vatRate);
  const subtotalNetto = roundPln(lines.reduce((sum, line) => sum + line.lineNetto, 0));
  const subtotalVat = roundPln(lines.reduce((sum, line) => sum + line.lineVat, 0));
  const amountNetto = roundPln(subtotalNetto + shippingSplit.netto);
  const vatAmount = roundPln(subtotalVat + shippingSplit.vat);
  const total = roundPln(subtotal + shipping);

  return {
    subtotal,
    shipping,
    total,
    hasPhysical,
    freeShipping,
    vatRate,
    subtotalNetto,
    subtotalVat,
    shippingNetto: shippingSplit.netto,
    shippingVat: shippingSplit.vat,
    amountNetto,
    vatAmount,
    lines,
  };
}

/** Allowed checkout percents: 10/20 off products, 100 off the whole order including shipping. */
export const DISCOUNT_PERCENTS = [10, 20, 100];

export function isSupportedDiscountPercent(percent) {
  return DISCOUNT_PERCENTS.includes(Number(percent));
}

function lineGross(line) {
  if (!line) return 0;
  if (line.lineBrutto != null || line.line_brutto != null) {
    return roundPln(Number(line.lineBrutto != null ? line.lineBrutto : line.line_brutto));
  }
  const qty = Math.max(1, parseInt(line.quantity, 10) || 1);
  const unit = line.unitPrice != null ? line.unitPrice : line.unit_price;
  return roundPln(Number(unit || 0) * qty);
}

function pricedLine(line, lineBrutto, vatRate) {
  const qty = Math.max(1, parseInt(line.quantity, 10) || 1);
  const rate = vatRate != null
    ? Number(vatRate)
    : Number(line.vatRate != null ? line.vatRate : (line.vat_rate != null ? line.vat_rate : DEFAULT_VAT_RATE));
  const split = splitGrossAmount(lineBrutto, rate);
  const unitPrice = roundPln(lineBrutto / qty);
  const unitSplit = splitGrossAmount(unitPrice, rate);
  return {
    ...line,
    vatRate: rate,
    unitPrice,
    unitPriceNetto: unitSplit.netto,
    lineBrutto: split.brutto,
    lineNetto: split.netto,
    lineVat: split.vat,
  };
}

/**
 * Scale product lines to the amounts actually paid after a percent rebate.
 * Remainder grosze land on the last line so the sum matches the discounted subtotal.
 */
export function applyPercentDiscountToLines(lines, percent, vatRate) {
  const rate = Number(percent);
  if (!Array.isArray(lines) || !isSupportedDiscountPercent(rate)) return null;
  const first = lines[0] || {};
  const sourceVat = vatRate != null
    ? Number(vatRate)
    : Number(first.vatRate != null ? first.vatRate : (first.vat_rate != null ? first.vat_rate : DEFAULT_VAT_RATE));
  const subtotal = roundPln(lines.reduce((sum, line) => sum + lineGross(line), 0));
  const discount = rate === 100 ? subtotal : roundPln(subtotal * (rate / 100));
  const target = roundPln(subtotal - discount);
  const factor = rate === 100 ? 0 : 1 - rate / 100;
  const next = lines.map((line) => pricedLine(line, roundPln(lineGross(line) * factor), sourceVat));
  if (!next.length) return next;
  const drift = roundPln(target - next.reduce((sum, line) => sum + line.lineBrutto, 0));
  if (drift !== 0) {
    const last = next[next.length - 1];
    next[next.length - 1] = pricedLine(last, roundPln(last.lineBrutto + drift), sourceVat);
  }
  return next;
}

/**
 * If stored lines are still catalog prices, return the amounts actually paid.
 * Already-discounted lines (sum matches the paid product total) are left unchanged.
 */
export function paidItemPrices(items, discount, paidProductTotal) {
  if (!Array.isArray(items) || items.length === 0) return items;
  const percent = Number(discount?.percent);
  if (!isSupportedDiscountPercent(percent)) return items;
  const sum = roundPln(items.reduce((total, item) => total + lineGross(item), 0));
  const target = paidProductTotal != null
    ? roundPln(paidProductTotal)
    : roundPln(sum - (percent === 100 ? sum : roundPln(sum * (percent / 100))));
  if (sum === target) return items;
  const priced = applyPercentDiscountToLines(items, percent);
  if (!priced) return items;
  const newSum = roundPln(priced.reduce((total, item) => total + item.lineBrutto, 0));
  return newSum === target ? priced : items;
}

/**
 * 10% and 20% off products (shipping unchanged). 100% makes the whole order 0 zł.
 * Catalog `subtotal` stays the original product total so the UI can show the rebate.
 * Line amounts are the prices actually paid.
 * @param {import('./index').OrderTotals} totals
 * @param {number} percent
 * @returns {import('./index').OrderTotals | null}
 */
export function applyPercentDiscount(totals, percent) {
  const rate = Number(percent);
  if (!totals || !isSupportedDiscountPercent(rate)) return null;
  const discount = roundPln(totals.subtotal * (rate / 100));
  const shipping = rate === 100 ? 0 : totals.shipping;
  const shippingNetto = rate === 100 ? 0 : totals.shippingNetto;
  const shippingVat = rate === 100 ? 0 : totals.shippingVat;
  const discountedSubtotal = roundPln(totals.subtotal - discount);
  const subSplit = splitGrossAmount(discountedSubtotal, totals.vatRate);
  const lines = applyPercentDiscountToLines(totals.lines || [], rate, totals.vatRate) || totals.lines;
  return {
    ...totals,
    lines,
    discountPercent: rate,
    discount,
    shipping,
    shippingNetto,
    shippingVat,
    freeShipping: totals.freeShipping || rate === 100,
    subtotalNetto: subSplit.netto,
    subtotalVat: subSplit.vat,
    amountNetto: roundPln(subSplit.netto + shippingNetto),
    vatAmount: roundPln(subSplit.vat + shippingVat),
    total: roundPln(discountedSubtotal + shipping),
  };
}

export function getProductPrice(sku) {
  const totals = computeOrderTotals([{ sku, quantity: 1 }]);
  return totals ? totals.total : null;
}

export function getSkuForTypeAndFormat(type, format) {
  if (type === 'interactive') return 'interactive';
  if (type === 'scratch') return !format || format === 'A3' ? 'scratch-a3' : null;
  if (type === 'letter') return 'santa-letter';
  return null;
}

export const SANTA_CERTIFICATE_SKU = 'santa-certificate';
export const SANTA_LETTER_SKU = 'santa-letter';

export function isLetterAddonSku(sku) {
  const product = getProduct(sku);
  return Boolean(product?.letterAddonOnly);
}

/**
 * @param {string} sku
 * @param {{ childName?: string } | null | undefined} [metadata]
 */
export function getOrderItemDisplayName(sku, metadata) {
  const product = getProduct(sku);
  if (sku === SANTA_CERTIFICATE_SKU && metadata?.childName) {
    return `CERTYFIKAT - ${String(metadata.childName).trim()}`;
  }
  return product?.name || sku;
}

export function isCalendarProductType(type) {
  return type === 'interactive' || type === 'scratch';
}

export function isCalendarSku(sku) {
  const product = getProduct(sku);
  return Boolean(product && isCalendarProductType(product.type));
}

/** Reusable October letter/certificate campaign code. */
export const LETTER_PROMO_CODE = 'MIKOLAJ20';
export const LETTER_PROMO_PERCENT = 20;
/** Europe/Warsaw instant when calendars go on sale and the letter promo ends. */
export const CALENDARS_ON_SALE_FROM = '2026-11-01T00:00:00+01:00';

export function isCalendarsOnSale(now = new Date()) {
  const ts = now instanceof Date ? now.getTime() : Date.parse(now);
  return Number.isFinite(ts) && ts >= Date.parse(CALENDARS_ON_SALE_FROM);
}

export function isLetterPromoActive(now = new Date()) {
  const ts = now instanceof Date ? now.getTime() : Date.parse(now);
  return Number.isFinite(ts) && ts < Date.parse(CALENDARS_ON_SALE_FROM);
}

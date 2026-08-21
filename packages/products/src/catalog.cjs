'use strict';

const SHIPPING_COST = 5;
const FREE_SHIPPING_THRESHOLD = 100;
const DEFAULT_VAT_RATE = 23;

function roundPln(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

function splitGrossAmount(grossBrutto, vatRate = DEFAULT_VAT_RATE) {
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

const PRODUCTS = {
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
    description: 'Fizyczny kalendarz adwentowy ze zdrapkami w formacie A3.',
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

const PRODUCT_FAMILIES = [
  {
    type: 'letter',
    slug: 'list-do-swietego-mikolaja',
    name: 'List do Świętego Mikołaja',
    shortDescription: 'Gotowy zestaw do wysyłki — 2 listy, koperta i naklejki.',
    icon: 'fa-envelope',
    creatorRoute: '/list-do-swietego-mikolaja',
    priceFrom: 29,
    features: ['2 wersje listu', 'Opisana koperta', 'Naklejki świąteczne', 'Wysyłka Pocztą Polską'],
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
    shortDescription: 'Fizyczny kalendarz — zdrapuj okienko każdego dnia i odkryj zadanie lub cytat.',
    icon: 'fa-hand-sparkles',
    creatorRoute: '/stworz-kalendarz/zdrapka',
    priceFrom: 49,
    features: ['Format A4 lub A3', 'Własna grafika', 'Realizacja 3–5 dni roboczych', 'Wysyłka Pocztą Polską'],
    requiresShipping: true,
    requiresDesign: true,
  },
];

function getProduct(sku) {
  return PRODUCTS[sku] || null;
}

function isPhysicalProduct(sku) {
  const product = getProduct(sku);
  return product ? product.requiresShipping : false;
}

/**
 * @param {Array<{ sku: string, quantity?: number }>} items
 * @param {{ vatRate?: number }} [options]
 */
function computeOrderTotals(items, options) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const vatRate = options && options.vatRate != null ? Number(options.vatRate) : DEFAULT_VAT_RATE;
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
      vatRate: vatRate,
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
    } else {
      shipping = SHIPPING_COST;
    }
  }

  const shippingSplit = splitGrossAmount(shipping, vatRate);
  const subtotalNetto = roundPln(lines.reduce(function (sum, line) { return sum + line.lineNetto; }, 0));
  const subtotalVat = roundPln(lines.reduce(function (sum, line) { return sum + line.lineVat; }, 0));
  const amountNetto = roundPln(subtotalNetto + shippingSplit.netto);
  const vatAmount = roundPln(subtotalVat + shippingSplit.vat);
  const total = roundPln(subtotal + shipping);

  return {
    subtotal: subtotal,
    shipping: shipping,
    total: total,
    hasPhysical: hasPhysical,
    freeShipping: freeShipping,
    vatRate: vatRate,
    subtotalNetto: subtotalNetto,
    subtotalVat: subtotalVat,
    shippingNetto: shippingSplit.netto,
    shippingVat: shippingSplit.vat,
    amountNetto: amountNetto,
    vatAmount: vatAmount,
    lines: lines,
  };
}

function getProductPrice(sku) {
  const totals = computeOrderTotals([{ sku, quantity: 1 }]);
  return totals ? totals.total : null;
}

function getSkuForTypeAndFormat(type, format) {
  if (type === 'interactive') return 'interactive';
  if (type === 'scratch') return format === 'A3' ? 'scratch-a3' : 'scratch-a4';
  if (type === 'letter') return 'santa-letter';
  return null;
}

const SANTA_CERTIFICATE_SKU = 'santa-certificate';
const SANTA_LETTER_SKU = 'santa-letter';

function isLetterAddonSku(sku) {
  const product = getProduct(sku);
  return Boolean(product && product.letterAddonOnly);
}

function getOrderItemDisplayName(sku, metadata) {
  const product = getProduct(sku);
  if (sku === SANTA_CERTIFICATE_SKU && metadata && metadata.childName) {
    return `CERTYFIKAT - ${String(metadata.childName).trim()}`;
  }
  return (product && product.name) || sku;
}

module.exports = {
  SHIPPING_COST,
  FREE_SHIPPING_THRESHOLD,
  DEFAULT_VAT_RATE,
  PRODUCTS,
  PRODUCT_FAMILIES,
  roundPln,
  splitGrossAmount,
  getProduct,
  getProductPrice,
  computeOrderTotals,
  getSkuForTypeAndFormat,
  isPhysicalProduct,
  SANTA_CERTIFICATE_SKU,
  SANTA_LETTER_SKU,
  isLetterAddonSku,
  getOrderItemDisplayName,
};

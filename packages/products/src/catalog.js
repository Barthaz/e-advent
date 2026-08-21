export const SHIPPING_COST = 5;
export const FREE_SHIPPING_THRESHOLD = 100;

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

export const PRODUCT_FAMILIES = [
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

export function getProduct(sku) {
  return PRODUCTS[sku] || null;
}

export function isPhysicalProduct(sku) {
  const product = getProduct(sku);
  return product ? product.requiresShipping : false;
}

/**
 * @param {Array<{ sku: string, quantity?: number }>} items
 * @returns {{ subtotal: number, shipping: number, total: number, hasPhysical: boolean, freeShipping: boolean } | null}
 */
export function computeOrderTotals(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  let subtotal = 0;
  let hasPhysical = false;

  for (const item of items) {
    const product = getProduct(item.sku);
    if (!product) return null;
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    subtotal += product.basePrice * qty;
    if (product.requiresShipping) hasPhysical = true;
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

  return {
    subtotal,
    shipping,
    total: subtotal + shipping,
    hasPhysical,
    freeShipping,
  };
}

export function getProductPrice(sku) {
  const totals = computeOrderTotals([{ sku, quantity: 1 }]);
  return totals ? totals.total : null;
}

export function getSkuForTypeAndFormat(type, format) {
  if (type === 'interactive') return 'interactive';
  if (type === 'scratch') return format === 'A3' ? 'scratch-a3' : 'scratch-a4';
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

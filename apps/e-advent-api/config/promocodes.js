/**
 * Shared promo-code rules (single source of truth for /promocodes and createFree).
 */

const PROMOS = {
  rabat100: {
    code: 'rabat100',
    discount: 100,
    allowedSkus: ['interactive'],
    message: 'Kod promocyjny jest prawidłowy! Otrzymujesz 100% rabatu.',
  },
};

function normalizeCode(code) {
  return String(code || '').trim().toLowerCase();
}

/**
 * @returns {{ valid: boolean, discount: number, message: string, promo?: object }}
 */
function validatePromoCode(code) {
  const key = normalizeCode(code);
  const promo = PROMOS[key];
  if (!promo) {
    return {
      valid: false,
      discount: 0,
      message: 'Kod promocyjny jest nieprawidłowy lub wygasł.',
    };
  }
  return {
    valid: true,
    discount: promo.discount,
    message: promo.message,
    promo,
  };
}

function isFullDiscountPromo(code) {
  const result = validatePromoCode(code);
  return result.valid && result.discount === 100;
}

function isSkuAllowedForPromo(code, sku) {
  const result = validatePromoCode(code);
  if (!result.valid || !result.promo) return false;
  return result.promo.allowedSkus.includes(sku);
}

module.exports = {
  PROMOS,
  normalizeCode,
  validatePromoCode,
  isFullDiscountPromo,
  isSkuAllowedForPromo,
};

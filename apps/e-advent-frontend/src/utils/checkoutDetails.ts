const CONTACT_KEY = 'e-advent-checkout-email';
export const CHECKOUT_PROMO_KEY = 'e-advent-checkout-promo';
const DELIVERY_KEY = 'e-advent-checkout-delivery';

export function readCheckoutEmail(): string {
  try { return sessionStorage.getItem(CONTACT_KEY) || ''; } catch { return ''; }
}
export function saveCheckoutEmail(email: string): void {
  try { sessionStorage.setItem(CONTACT_KEY, email.trim()); } catch { /* session storage may be disabled */ }
}
export function isValidCheckoutEmail(email: string | undefined | null): boolean {
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
}
export function readCheckoutDelivery(): import('../components/checkout/useInpostQuote').InpostChoice {
  try {
    const value = JSON.parse(sessionStorage.getItem(DELIVERY_KEY) || 'null');
    if (value?.type === 'courier_inpost') return { type: value.type };
    if (value?.type === 'parcel_inpost') return {
      type: value.type,
      pointId: typeof value.pointId === 'string' ? value.pointId : undefined,
      pointLabel: typeof value.pointLabel === 'string' ? value.pointLabel : undefined,
    };
  } catch { /* ignore invalid cache */ }
  return { type: 'parcel_inpost' };
}
export function saveCheckoutDelivery(value: import('../components/checkout/useInpostQuote').InpostChoice): void {
  try { sessionStorage.setItem(DELIVERY_KEY, JSON.stringify(value)); } catch { /* ignore */ }
}
export function clearCheckoutDetails(): void {
  try { [CONTACT_KEY, CHECKOUT_PROMO_KEY, DELIVERY_KEY].forEach(key => sessionStorage.removeItem(key)); } catch { /* ignore */ }
}

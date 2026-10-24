import { CART_CHANGED_EVENT, CART_STORAGE_KEY, clearCartStorage } from './cartStorage';
import { clearOrderSummary } from './orderSummary';

const SESSION_KEY = 'e-advent-checkout-token';
export const PENDING_CHECKOUT_KEY = 'e-advent-pending-checkout';

export interface PendingCheckout {
  paymentIntentId: string;
  orderId: string;
  orderNumber?: string | null;
  clientSecret: string;
  cartSnapshot: string | null;
  createdAt: number;
}

export function getCheckoutToken(): string {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (saved && /^[a-f0-9]{64}$/.test(saved)) return saved;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem(SESSION_KEY, token);
  return token;
}

export function loadPendingCheckout(): PendingCheckout | null {
  try {
    const raw = localStorage.getItem(PENDING_CHECKOUT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PendingCheckout;
      if (parsed && typeof parsed.paymentIntentId === 'string' && parsed.paymentIntentId) return parsed;
    }
  } catch {
    /* ignore malformed cache */
  }

  const paymentIntentId = localStorage.getItem('paymentIntentId');
  const orderId = localStorage.getItem('orderId');
  if (!paymentIntentId || !orderId) return null;
  return {
    paymentIntentId,
    orderId,
    orderNumber: localStorage.getItem('orderNumber'),
    clientSecret: sessionStorage.getItem(`e-advent-payment:${paymentIntentId}`) || '',
    cartSnapshot: sessionStorage.getItem(`e-advent-checkout-cart:${paymentIntentId}`),
    createdAt: Date.now(),
  };
}

export function savePendingCheckout(pending: PendingCheckout): void {
  localStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(pending));
}

export function notifyCartChanged(): void {
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

function clearLocalCheckoutKeys(paymentIntentId?: string): void {
  try {
    if (!paymentIntentId || localStorage.getItem('paymentIntentId') === paymentIntentId) {
      localStorage.removeItem('paymentIntentId');
      localStorage.removeItem('orderId');
      localStorage.removeItem('orderNumber');
      localStorage.removeItem('orderAmount');
    }
    const pending = (() => {
      try {
        return JSON.parse(localStorage.getItem(PENDING_CHECKOUT_KEY) || 'null') as PendingCheckout | null;
      } catch {
        return null;
      }
    })();
    if (!paymentIntentId || pending?.paymentIntentId === paymentIntentId) {
      localStorage.removeItem(PENDING_CHECKOUT_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function finishCheckout(paymentIntentId?: string): void {
  const owner = paymentIntentId ? sessionStorage.getItem(`e-advent-checkout-owner:${paymentIntentId}`) : null;
  if (!paymentIntentId || owner === sessionStorage.getItem(SESSION_KEY)) {
    sessionStorage.removeItem(SESSION_KEY);
  }
  if (paymentIntentId) {
    sessionStorage.removeItem(`e-advent-checkout-owner:${paymentIntentId}`);
    sessionStorage.removeItem(`e-advent-payment:${paymentIntentId}`);
    sessionStorage.removeItem(`e-advent-checkout-cart:${paymentIntentId}`);
  }
  clearLocalCheckoutKeys(paymentIntentId);
  clearOrderSummary();
  try {
    const raw = localStorage.getItem('ga4_purchase_payload');
    const ga = raw ? JSON.parse(raw) as { transactionId?: string } : null;
    if (!ga || !paymentIntentId || ga.transactionId === paymentIntentId) {
      localStorage.removeItem('ga4_purchase_payload');
    }
  } catch {
    localStorage.removeItem('ga4_purchase_payload');
  }
}

/** Clears the paid cart when it still matches the checkout snapshot, then drops checkout cache. */
export function clearCartAfterPaidOrder(paymentIntentId: string): boolean {
  const snapshot =
    sessionStorage.getItem(`e-advent-checkout-cart:${paymentIntentId}`)
    ?? loadPendingCheckout()?.cartSnapshot
    ?? null;
  const current = localStorage.getItem(CART_STORAGE_KEY);
  const shouldClear = Boolean(snapshot) && (!current || current === snapshot);
  if (shouldClear) clearCartStorage();
  finishCheckout(paymentIntentId);
  if (shouldClear) notifyCartChanged();
  return shouldClear;
}

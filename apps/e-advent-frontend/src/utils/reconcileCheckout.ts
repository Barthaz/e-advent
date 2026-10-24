import { getPaymentByIntentId, PaymentLookupError } from '../api/api';
import { markCalendarPurchased } from './creatorStorage';
import { CART_STORAGE_KEY, loadCart, saveCart, sanitizeCartItems } from './cartStorage';
import {
  clearCartAfterPaidOrder,
  finishCheckout,
  loadPendingCheckout,
  notifyCartChanged,
} from './checkoutSession';

const PAID_STATUSES = new Set(['succeeded']);
const AWAITING_ORDER = new Set(['pending', 'processing']);
const AWAITING_STRIPE = new Set([
  'processing',
  'requires_action',
  'requires_payment_method',
  'requires_confirmation',
  'requires_capture',
]);

export type ReconcileResult = 'cleared' | 'kept' | 'restored' | 'skipped';

function restoreSnapshot(snapshot: string | null): boolean {
  if (!snapshot) return false;
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
    saveCart(sanitizeCartItems(parsed));
    notifyCartChanged();
    return true;
  } catch {
    return false;
  }
}

export async function reconcilePendingCheckout(): Promise<ReconcileResult> {
  const pending = loadPendingCheckout();
  if (!pending?.paymentIntentId) return 'skipped';

  try {
    const response = await getPaymentByIntentId(pending.paymentIntentId);
    const orderStatus = response.payment.status || '';
    const stripeStatus = response.stripeStatus || '';
    const paid = PAID_STATUSES.has(orderStatus) && PAID_STATUSES.has(stripeStatus);
    const awaiting = AWAITING_ORDER.has(orderStatus) || AWAITING_STRIPE.has(stripeStatus);

    if (paid) {
      for (const item of response.payment.items || []) {
        if (item.calendarId) markCalendarPurchased(item.calendarId);
      }
      const cleared = clearCartAfterPaidOrder(pending.paymentIntentId);
      return cleared ? 'cleared' : 'kept';
    }

    if (awaiting) {
      if (loadCart().length === 0 && restoreSnapshot(pending.cartSnapshot)) return 'restored';
      return 'kept';
    }

    const restored = loadCart().length === 0 && restoreSnapshot(pending.cartSnapshot);
    finishCheckout(pending.paymentIntentId);
    return restored ? 'restored' : 'kept';
  } catch (error) {
    if (error instanceof PaymentLookupError && error.status === 404) {
      const current = localStorage.getItem(CART_STORAGE_KEY);
      if (!current && restoreSnapshot(pending.cartSnapshot)) {
        finishCheckout(pending.paymentIntentId);
        return 'restored';
      }
      finishCheckout(pending.paymentIntentId);
      return 'kept';
    }
    return 'kept';
  }
}

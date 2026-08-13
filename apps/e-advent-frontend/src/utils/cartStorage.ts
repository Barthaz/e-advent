import { computeOrderTotals, type OrderTotals } from '../config/products';

export const CART_STORAGE_KEY = 'e-advent-cart';

export interface CartItem {
  id: string;
  sku: string;
  quantity: number;
  calendarId?: string;
  label?: string;
  unitPrice?: number;
  /** Prefill checkout email / name for personalized calendars */
  customerEmail?: string;
  customerName?: string;
  format?: string;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is CartItem => {
        if (!item || typeof item !== 'object') return false;
        const row = item as CartItem;
        return typeof row.sku === 'string' && typeof row.id === 'string';
      })
      .map((item) => ({
        ...item,
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      }));
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function clearCartStorage(): void {
  localStorage.removeItem(CART_STORAGE_KEY);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + Math.max(1, item.quantity || 1), 0);
}

export function getCartTotals(items: CartItem[]): OrderTotals | null {
  if (items.length === 0) {
    return {
      subtotal: 0,
      shipping: 0,
      total: 0,
      hasPhysical: false,
      freeShipping: false,
    };
  }
  return computeOrderTotals(items.map((item) => ({ sku: item.sku, quantity: item.quantity })));
}

export function createCartItem(
  input: Omit<CartItem, 'id' | 'quantity'> & { quantity?: number },
): CartItem {
  return {
    id: createId(),
    sku: input.sku,
    quantity: Math.max(1, Math.floor(input.quantity ?? 1)),
    ...(input.calendarId ? { calendarId: input.calendarId } : {}),
    ...(input.label ? { label: input.label } : {}),
    ...(input.unitPrice != null ? { unitPrice: input.unitPrice } : {}),
    ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
    ...(input.customerName ? { customerName: input.customerName } : {}),
    ...(input.format ? { format: input.format } : {}),
  };
}

import { getOrderItemDisplayName, getProduct } from '../config/products';
import type { AnalyticsItem } from './analytics';
import type { CartItem } from './cartStorage';
import type { ShippingAddress } from '../types/order';

export const ORDER_SUMMARY_KEY = 'e-advent-order-summary';

export interface OrderLineItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderSummary {
  items: OrderLineItem[];
  shipping?: ShippingAddress | null;
  format?: string;
  designUrl?: string;
  orderNumber?: string;
  customerEmail?: string;
}

export function toOrderLineItems(items: AnalyticsItem[]): OrderLineItem[] {
  return items.map((i) => ({
    sku: i.sku,
    name: i.name || getProduct(i.sku)?.name || i.sku,
    quantity: Math.max(1, i.quantity ?? 1),
    price: i.price ?? getProduct(i.sku)?.basePrice ?? 0,
  }));
}

export function cartItemsToOrderLines(items: CartItem[]): OrderLineItem[] {
  return items.map((i) => ({
    sku: i.sku,
    name:
      i.label
      || getOrderItemDisplayName(i.sku, i.childName ? { childName: i.childName } : undefined)
      || getProduct(i.sku)?.name
      || i.sku,
    quantity: Math.max(1, i.quantity ?? 1),
    price: i.unitPrice ?? getProduct(i.sku)?.basePrice ?? 0,
  }));
}

export function paymentItemsToOrderLines(
  items: Array<{
    sku: string;
    quantity?: number;
    unitPrice?: number;
    metadata?: { childName?: string } | null;
  }>,
): OrderLineItem[] {
  return items.map((i) => ({
    sku: i.sku,
    name: getOrderItemDisplayName(i.sku, i.metadata || undefined) || getProduct(i.sku)?.name || i.sku,
    quantity: Math.max(1, i.quantity ?? 1),
    price: Number(i.unitPrice) || getProduct(i.sku)?.basePrice || 0,
  }));
}

export function saveOrderSummary(summary: OrderSummary): void {
  try {
    sessionStorage.setItem(ORDER_SUMMARY_KEY, JSON.stringify(summary));
  } catch {
    /* ignore */
  }
}

export function loadOrderSummary(): OrderSummary | null {
  try {
    const raw = sessionStorage.getItem(ORDER_SUMMARY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrderSummary;
    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOrderSummary(): void {
  try {
    sessionStorage.removeItem(ORDER_SUMMARY_KEY);
  } catch {
    /* ignore */
  }
}

/** Prefer richer item list (never replace 4 products with 1). */
export function mergeOrderItems(preferred: OrderLineItem[], fallback: OrderLineItem[]): OrderLineItem[] {
  if (preferred.length >= fallback.length && preferred.length > 0) return preferred;
  if (fallback.length > preferred.length) return fallback;
  return preferred.length > 0 ? preferred : fallback;
}

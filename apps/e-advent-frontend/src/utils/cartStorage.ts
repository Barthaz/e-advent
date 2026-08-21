import { computeOrderTotals, getOrderItemDisplayName, getProduct, type OrderTotals } from '../config/products';

export const CART_STORAGE_KEY = 'e-advent-cart';
export const SANTA_CERTIFICATE_SKU = 'santa-certificate';
export const SANTA_LETTER_SKU = 'santa-letter';

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
  /** Imię dziecka na certyfikacie grzecznego dziecka */
  childName?: string;
  /** Certyfikat powiązany z konkretną pozycją listu w koszyku */
  linkedLetterId?: string;
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
    ...(input.childName ? { childName: input.childName } : {}),
    ...(input.linkedLetterId ? { linkedLetterId: input.linkedLetterId } : {}),
  };
}

export function hasLinkedCertificate(items: CartItem[], letterId: string): boolean {
  return items.some(
    (item) => item.sku === SANTA_CERTIFICATE_SKU && item.linkedLetterId === letterId,
  );
}

/** Usuwa certyfikaty-sieroty i pozycje bez powiązanego listu. */
export function sanitizeCartItems(items: CartItem[]): CartItem[] {
  const ids = new Set(items.map((item) => item.id));
  return items.filter((item) => {
    if (item.sku !== SANTA_CERTIFICATE_SKU) return true;
    return Boolean(item.linkedLetterId && ids.has(item.linkedLetterId));
  });
}

export function appendSantaLetterBundle(
  items: CartItem[],
  input: { childName?: string; letterLabel?: string },
): { items: CartItem[]; added: CartItem[] } {
  const letterProduct = getProduct(SANTA_LETTER_SKU);
  const certificateProduct = getProduct(SANTA_CERTIFICATE_SKU);
  const trimmedName = input.childName?.trim() ?? '';
  const withCertificate = trimmedName.length >= 2;

  if (withCertificate) {
    const letter = createCartItem({
      sku: SANTA_LETTER_SKU,
      quantity: 1,
      label: input.letterLabel ?? letterProduct?.name,
      unitPrice: letterProduct?.basePrice,
    });
    const certificate = createCartItem({
      sku: SANTA_CERTIFICATE_SKU,
      quantity: 1,
      childName: trimmedName,
      linkedLetterId: letter.id,
      label: `CERTYFIKAT - ${trimmedName}`,
      unitPrice: certificateProduct?.basePrice,
    });
    return { items: [...items, letter, certificate], added: [letter, certificate] };
  }

  const mergeTarget = items.find(
    (item) => item.sku === SANTA_LETTER_SKU && !hasLinkedCertificate(items, item.id),
  );

  if (mergeTarget) {
    const updated: CartItem = {
      ...mergeTarget,
      quantity: mergeTarget.quantity + 1,
      label: input.letterLabel ?? mergeTarget.label ?? letterProduct?.name,
    };
    return {
      items: items.map((item) => (item.id === mergeTarget.id ? updated : item)),
      added: [updated],
    };
  }

  const letter = createCartItem({
    sku: SANTA_LETTER_SKU,
    quantity: 1,
    label: input.letterLabel ?? letterProduct?.name,
    unitPrice: letterProduct?.basePrice,
  });
  return { items: [...items, letter], added: [letter] };
}

export function removeCartItem(items: CartItem[], id: string): CartItem[] {
  const target = items.find((item) => item.id === id);
  if (!target) return items;
  if (target.sku === SANTA_CERTIFICATE_SKU) return items;
  return sanitizeCartItems(
    items.filter((item) => item.id !== id && item.linkedLetterId !== id),
  );
}

export type CartDisplayRow =
  | {
      kind: 'item';
      item: CartItem;
      removable: boolean;
      lockQuantity: boolean;
    }
  | {
      kind: 'addon';
      item: CartItem;
      parentId: string;
    };

export function buildCartDisplayRows(items: CartItem[]): CartDisplayRow[] {
  const sanitized = sanitizeCartItems(items);
  const certificates = sanitized.filter((item) => item.sku === SANTA_CERTIFICATE_SKU);
  const mains = sanitized.filter((item) => item.sku !== SANTA_CERTIFICATE_SKU);
  const rows: CartDisplayRow[] = [];

  for (const item of mains) {
    const letterWithCert =
      item.sku === SANTA_LETTER_SKU && hasLinkedCertificate(sanitized, item.id);
    rows.push({
      kind: 'item',
      item,
      removable: true,
      lockQuantity: Boolean(item.calendarId) || letterWithCert,
    });
    for (const certificate of certificates.filter((c) => c.linkedLetterId === item.id)) {
      rows.push({ kind: 'addon', item: certificate, parentId: item.id });
    }
  }

  return rows;
}

export function cartItemCheckoutKey(item: CartItem): string {
  const child = item.childName ? `:child:${item.childName}` : '';
  const link = item.linkedLetterId ? `:link:${item.linkedLetterId}` : '';
  return `${item.sku}:${item.quantity}:${item.calendarId || ''}${child}${link}`;
}

export function cartItemToCheckoutItem(item: CartItem): {
  sku: string;
  quantity: number;
  calendarId?: string;
  metadata?: { childName: string };
} {
  return {
    sku: item.sku,
    quantity: item.quantity,
    ...(item.calendarId ? { calendarId: item.calendarId } : {}),
    ...(item.childName ? { metadata: { childName: item.childName } } : {}),
  };
}

export function getCartItemDisplayName(item: CartItem): string {
  if (item.label) return item.label;
  return getOrderItemDisplayName(
    item.sku,
    item.childName ? { childName: item.childName } : undefined,
  );
}

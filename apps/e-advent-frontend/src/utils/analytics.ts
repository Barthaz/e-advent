import { getProduct } from '../config/products';

const GA_ID_TEST = 'G-2EK9WZNGJ1';
const GA_ID_PROD = 'G-5C07HGBQ6B';

export const GA_PURCHASE_PAYLOAD_KEY = 'ga4_purchase_payload';

export function getGaMeasurementId(): string {
  const fromEnv = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (typeof fromEnv === 'string' && fromEnv.startsWith('G-')) {
    return fromEnv;
  }
  return import.meta.env.DEV ? GA_ID_TEST : GA_ID_PROD;
}

function gtagSafe(command: 'event' | 'config', ...args: unknown[]) {
  if (typeof window === 'undefined' || !window.gtag) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window.gtag as any)(command, ...args);
}

function fbqSafe(...args: unknown[]) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq(...args);
}

export interface AnalyticsItem {
  sku: string;
  name: string;
  price: number;
  quantity?: number;
  category?: string;
}

export interface GaPurchasePayload {
  transactionId: string;
  value: number;
  shipping?: number;
  items: AnalyticsItem[];
}

function resolveItemCategory(item: AnalyticsItem): string | undefined {
  if (item.category) return item.category;
  if (item.sku === 'santa-certificate') return 'certificate';
  const product = getProduct(item.sku);
  return product?.type;
}

function toGaItems(items: AnalyticsItem[]) {
  return items.map((item) => {
    const quantity = item.quantity ?? 1;
    const category = resolveItemCategory(item);
    return {
      item_id: item.sku,
      item_name: item.name,
      price: item.price,
      quantity,
      ...(category ? { item_category: category } : {}),
    };
  });
}

function purchaseDedupKey(transactionId: string): string {
  return `ga4_purchase_${transactionId}`;
}

export function saveGaPurchasePayload(payload: GaPurchasePayload): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GA_PURCHASE_PAYLOAD_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function loadGaPurchasePayload(): GaPurchasePayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GA_PURCHASE_PAYLOAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GaPurchasePayload;
    if (!parsed || typeof parsed.transactionId !== 'string' || !Array.isArray(parsed.items)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearGaPurchasePayload(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GA_PURCHASE_PAYLOAD_KEY);
  } catch {
    /* ignore */
  }
}

export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return;
  const pagePath = path.startsWith('/') ? path : `/${path}`;
  const pageLocation = `${window.location.origin}${pagePath}`;

  gtagSafe('event', 'page_view', {
    page_title: title ?? document.title,
    page_location: pageLocation,
    page_path: pagePath,
    send_to: getGaMeasurementId(),
  });
  fbqSafe('track', 'PageView');
}

export function trackViewItem(item: AnalyticsItem) {
  gtagSafe('event', 'view_item', {
    currency: 'PLN',
    value: item.price,
    items: toGaItems([item]),
  });
  fbqSafe('track', 'ViewContent', {
    content_ids: [item.sku],
    content_name: item.name,
    content_type: 'product',
    value: item.price,
    currency: 'PLN',
  });
}

export function trackAddToCart(item: AnalyticsItem) {
  const qty = item.quantity ?? 1;
  const value = item.price * qty;
  gtagSafe('event', 'add_to_cart', {
    currency: 'PLN',
    value,
    items: toGaItems([{ ...item, quantity: qty }]),
  });
  fbqSafe('track', 'AddToCart', {
    content_ids: [item.sku],
    content_name: item.name,
    content_type: 'product',
    value,
    currency: 'PLN',
  });
}

export function trackBeginCheckout(params: {
  value: number;
  items: AnalyticsItem[];
}) {
  gtagSafe('event', 'begin_checkout', {
    currency: 'PLN',
    value: params.value,
    items: toGaItems(params.items),
  });
  fbqSafe('track', 'InitiateCheckout', {
    content_ids: params.items.map((i) => i.sku),
    value: params.value,
    currency: 'PLN',
    num_items: params.items.reduce((s, i) => s + (i.quantity ?? 1), 0),
  });
}

/** Fires purchase once per transaction_id (sessionStorage dedup). Returns whether it was sent. */
export function trackPurchase(params: {
  transactionId: string;
  value: number;
  items: AnalyticsItem[];
  shipping?: number;
}): boolean {
  if (typeof window === 'undefined') return false;
  const transactionId = params.transactionId || 'unknown';
  const key = purchaseDedupKey(transactionId);
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
  } catch {
    /* proceed without dedup if storage blocked */
  }

  gtagSafe('event', 'purchase', {
    transaction_id: transactionId,
    currency: 'PLN',
    value: params.value,
    ...(params.shipping != null ? { shipping: params.shipping } : {}),
    items: toGaItems(params.items),
  });
  fbqSafe('track', 'Purchase', {
    content_ids: params.items.map((i) => i.sku),
    value: params.value,
    currency: 'PLN',
  });
  return true;
}

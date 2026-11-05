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
  if (product?.type === 'voice') return 'santa_message';
  return product?.type;
}

function toGaItems(items: AnalyticsItem[]) {
  return items.map((item) => {
    const quantity = item.quantity ?? 1;
    const category = resolveItemCategory(item);
    const variant = getProduct(item.sku)?.voiceMode;
    return {
      item_id: item.sku,
      item_name: item.name,
      price: item.price,
      quantity,
      ...(category ? { item_category: category } : {}),
      ...(variant ? { item_variant: variant } : {}),
    };
  });
}

/** Paths whose last segment is a bearer token (never sent to analytics). */
const PRIVATE_PATHS: Array<[RegExp, string]> = [
  [/^\/od-mikolaja\/(?!przyklad(?:[/?#]|$))[^/?#]+/, '/od-mikolaja/[private]'],
  [/^\/wiadomosc-od-mikolaja\/personalizacja\/[^/?#]+/, '/wiadomosc-od-mikolaja/personalizacja/[private]'],
];

export function sanitizePagePath(path: string): string {
  for (const [pattern, replacement] of PRIVATE_PATHS) {
    if (pattern.test(path)) return replacement;
  }
  return path;
}

export function isPrivatePagePath(path: string): boolean {
  return sanitizePagePath(path) !== path;
}

export type SantaEventName =
  | 'santa_product_cta_click'
  | 'santa_addon_toggle'
  | 'santa_creator_start'
  | 'santa_creator_step_complete'
  | 'santa_creator_validation_error'
  | 'santa_creator_submit'
  | 'santa_script_approved'
  | 'santa_player_open'
  | 'santa_audio_play'
  | 'santa_audio_progress'
  | 'santa_audio_download'
  | 'santa_player_error';

/** Only low-cardinality, non-personal parameters may be attached to custom events. */
export interface SantaEventParams {
  purchase_mode?: 'standalone' | 'letter_addon';
  cta_location?: string;
  checked?: boolean;
  step?: 1 | 2 | 3;
  field_name?: string;
  error_type?: string;
  progress_percent?: 25 | 50 | 75 | 100;
  source?: 'email' | 'direct' | 'demo';
  audio_duration_bucket?: string;
}

export function trackSantaEvent(name: SantaEventName, params: SantaEventParams = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''));
  gtagSafe('event', name, clean);
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

let privateLocationSet = false;

export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return;
  const rawPath = path.startsWith('/') ? path : `/${path}`;
  const pagePath = sanitizePagePath(rawPath);
  const pageLocation = `${window.location.origin}${pagePath}`;
  const isPrivate = pagePath !== rawPath;

  // Later events (play, progress…) inherit page_location; keep the token out of all of them.
  if ((isPrivate || privateLocationSet) && window.gtag) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.gtag as any)('set', { page_location: pageLocation, page_path: pagePath, ...(isPrivate ? { page_referrer: '' } : {}) });
    privateLocationSet = isPrivate;
  }
  gtagSafe('event', 'page_view', {
    page_title: title ?? document.title,
    page_location: pageLocation,
    page_path: pagePath,
    send_to: getGaMeasurementId(),
  });
  if (!isPrivate) fbqSafe('track', 'PageView');
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

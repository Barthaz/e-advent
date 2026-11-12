import { privateTitle, publicPaths } from '../seo/pages';
import { getProduct } from '../config/products';

const GA_ID_TEST = 'G-2EK9WZNGJ1';
const GA_ID_PROD = 'G-5C07HGBQ6B';

export const GA_PURCHASE_PAYLOAD_KEY = 'ga4_purchase_payload';

export function getGaMeasurementId(): string {
  const fromEnv = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (typeof fromEnv === 'string' && fromEnv.startsWith('G-')) {
    return fromEnv;
  }
  return import.meta.env.MODE === 'test' || import.meta.env.DEV ? GA_ID_TEST : GA_ID_PROD;
}

function gtagSafe(command: 'event' | 'config', ...args: unknown[]) {
  if (typeof window === 'undefined' || !window.gtag) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window.gtag as any)(command, ...args);
}

function fbqSafe(...args: unknown[]) {
  if (typeof window === 'undefined' || !window.fbq || isPrivatePagePath(window.location.pathname)) return;
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
      item_name: getProduct(item.sku)?.name ?? (item.sku === 'santa-certificate' ? 'Certyfikat Grzecznego Dziecka' : item.sku),
      price: item.price,
      quantity,
      ...(category ? { item_category: category } : {}),
      ...(variant ? { item_variant: variant } : {}),
    };
  });
}

/** Paths whose last segment is a bearer token (never sent to analytics). */
const PRIVATE_PATHS: Array<[RegExp, string]> = [
  [/^\/(kalendarz|calendar)\/[^/?#]+/, '/kalendarz/[private]'],
  [/^\/podglad-okienka\/[^/?#]+/, '/podglad-okienka/[private]'],
  [/^\/od-mikolaja\/(?!przyklad(?:[/?#]|$))[^/?#]+/, '/od-mikolaja/[private]'],
  [/^\/wiadomosc-od-mikolaja\/personalizacja\/[^/?#]+/, '/wiadomosc-od-mikolaja/personalizacja/[private]'],
];

export function sanitizePagePath(path: string): string {
  for (const [pattern, replacement] of PRIVATE_PATHS) {
    if (pattern.test(path)) return replacement;
  }
  const url = new URL(path, 'https://e-advent.pl');
  if (url.pathname.startsWith('/od-mikolaja/przyklad/')) return '/od-mikolaja/przyklad';
  if (!publicPaths.includes(url.pathname) && !privateTitle(url.pathname)) return '/404';
  const campaign = new URLSearchParams();
  if (publicPaths.includes(url.pathname)) {
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid']) {
      const value = url.searchParams.get(key);
      if (value && /^[\p{L}\d _.-]{1,120}$/u.test(value)) campaign.set(key, value);
    }
  }
  return url.pathname + (campaign.size ? '?' + campaign.toString() : '');
}

export function isPrivatePagePath(path: string): boolean {
  return PRIVATE_PATHS.some(([pattern]) => pattern.test(path));
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

let previousLocation: string | undefined;

export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined' || !window.gtag) return;
  const pagePath = sanitizePagePath(path);
  const pageLocation = window.location.origin + pagePath;
  let referrer = previousLocation ?? '';
  if (previousLocation === undefined && document.referrer) {
    const source = new URL(document.referrer);
    referrer = source.origin === window.location.origin ? source.origin + sanitizePagePath(source.pathname) : source.origin;
  }
  const fields = { page_path: pagePath.split('?')[0], page_location: pageLocation,
    page_title: privateTitle(path.split('?')[0]) ?? title ?? document.title, page_referrer: referrer };
  window.gtag('set', fields);
  gtagSafe('event', 'page_view', { ...fields, send_to: getGaMeasurementId() });
  previousLocation = pageLocation;
  if (!isPrivatePagePath(path)) fbqSafe('track', 'PageView');
}

let lastProduct: { path: string; item: AnalyticsItem } | undefined;

export function replayProductView() {
  if (lastProduct?.path === window.location.pathname) trackViewItem(lastProduct.item);
}

export function trackViewItem(item: AnalyticsItem) {
  if (typeof window !== 'undefined') lastProduct = { path: window.location.pathname, item };
  gtagSafe('event', 'view_item', {
    currency: 'PLN',
    value: item.price,
    items: toGaItems([item]),
  });
  fbqSafe('track', 'ViewContent', {
    content_ids: [item.sku],
    content_name: getProduct(item.sku)?.name ?? item.sku,
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

export function trackCartEvent(event: 'view_cart' | 'remove_from_cart', items: AnalyticsItem[]) {
  const value = items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0);
  gtagSafe('event', event, { currency: 'PLN', value: Math.round(value * 100) / 100, items: toGaItems(items) });
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
  if (typeof window === 'undefined' || !window.gtag || !params.transactionId) return false;
  const transactionId = params.transactionId;
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

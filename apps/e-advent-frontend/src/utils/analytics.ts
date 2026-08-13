const GA_ID = 'G-5C07HGBQ6B';

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
}

export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return;
  const pagePath = path.startsWith('/') ? path : `/${path}`;
  const pageLocation = `${window.location.origin}${pagePath}`;

  gtagSafe('event', 'page_view', {
    page_title: title ?? document.title,
    page_location: pageLocation,
    page_path: pagePath,
    send_to: GA_ID,
  });
  fbqSafe('track', 'PageView');
}

export function trackViewItem(item: AnalyticsItem) {
  gtagSafe('event', 'view_item', {
    currency: 'PLN',
    value: item.price,
    items: [
      {
        item_id: item.sku,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity ?? 1,
      },
    ],
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
    items: [
      {
        item_id: item.sku,
        item_name: item.name,
        price: item.price,
        quantity: qty,
      },
    ],
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
    items: params.items.map((item) => ({
      item_id: item.sku,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity ?? 1,
    })),
  });
  fbqSafe('track', 'InitiateCheckout', {
    content_ids: params.items.map((i) => i.sku),
    value: params.value,
    currency: 'PLN',
    num_items: params.items.reduce((s, i) => s + (i.quantity ?? 1), 0),
  });
}

export function trackPurchase(params: {
  transactionId: string;
  value: number;
  items: AnalyticsItem[];
}) {
  gtagSafe('event', 'purchase', {
    transaction_id: params.transactionId,
    currency: 'PLN',
    value: params.value,
    items: params.items.map((item) => ({
      item_id: item.sku,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity ?? 1,
    })),
  });
  fbqSafe('track', 'Purchase', {
    content_ids: params.items.map((i) => i.sku),
    value: params.value,
    currency: 'PLN',
  });
}

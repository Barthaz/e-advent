import { afterEach, expect, it, vi } from 'vitest';
import { trackPageView, trackCartEvent, trackPurchase } from './analytics';
import { chooseMeasurement } from './measurementConsent';

afterEach(() => { delete window.gtag; delete window.dataLayer; localStorage.clear(); sessionStorage.clear(); });

it('queues a manual config only after opt-in and reports a safe checkout address', () => {
  chooseMeasurement(false);
  expect(window.gtag).toBeUndefined();
  chooseMeasurement(true);
  const events = () => window.dataLayer!.map(entry => Array.from(entry as ArrayLike<unknown>));
  expect(events()).toContainEqual(['config', expect.any(String), { send_page_view: false }]);
  trackPageView('/sukces?payment_intent_client_secret=private', 'Poprzedni ekran');
  expect(events().filter(entry => entry[1] === 'page_view')).toHaveLength(1);
  expect(events()).toContainEqual(['event', 'page_view', expect.objectContaining({ page_title: 'Potwierdzenie zamówienia | e-Advent', page_path: '/sukces' })]);
  expect(JSON.stringify(events())).not.toContain('client_secret');
});

it('masks calendar identifiers, free-text item names and private referrers in subsequent events', () => {
  window.gtag = vi.fn();
  trackPageView('/calendar/private-id?email=personal', 'Personal title');
  trackPageView('/koszyk');
  const item = { sku: 'voice-message', name: 'Personal name', price: 10, quantity: 2 };
  trackCartEvent('view_cart', [item]);
  trackCartEvent('remove_from_cart', [item]);
  const order = { transactionId: 'order-1', items: [item], shipping: 5, value: 20 };
  expect(trackPurchase(order)).toBe(true);
  expect(trackPurchase(order)).toBe(false);
  const calls = vi.mocked(window.gtag).mock.calls;
  expect(JSON.stringify(calls)).not.toMatch(/Personal name|Personal title|private-id|email=/);
  expect(calls).toContainEqual(['event', 'page_view', expect.objectContaining({ page_referrer: expect.stringContaining('/kalendarz/[private]') })]);
  expect(calls).toContainEqual(['event', 'remove_from_cart', expect.objectContaining({ currency: 'PLN', value: 20 })]);
});

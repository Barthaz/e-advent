import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getCalendar, getPaymentByIntentId } from '../api/api';
import { trackPurchase } from '../utils/analytics';
import Success from './Success';

vi.mock('../api/api', () => ({ getCalendar: vi.fn(), getPaymentByIntentId: vi.fn() }));
vi.mock('../utils/analytics', () => ({ trackPurchase: vi.fn() }));
vi.mock('../utils/creatorStorage', () => ({ markCalendarPurchased: vi.fn() }));
const payment = {
  id: 'canonical-order-uuid', orderNumberDisplay: '000042', stripePaymentIntentId: 'pi_paid',
  amount: 34, shippingAmount: 5, status: 'succeeded', customerEmail: 'buyer@example.com',
  shippingAddress: { fullName: 'Anna Nowak', street: 'Właściwa 1', city: 'Warszawa', postalCode: '00-001', phone: '500600700' },
  items: [{ sku: 'santa-letter', quantity: 1, unitPrice: 29 }],
};
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  vi.mocked(getPaymentByIntentId).mockResolvedValue({ payment, stripeStatus: 'succeeded', emailStatus: 'sent' });
});
afterEach(cleanup);
const show = () => render(<MemoryRouter initialEntries={['/sukces?payment_intent=pi_paid&calendar_id=unrelated-calendar']}><Success /></MemoryRouter>);

it('shows the readable order number and authoritative shipping despite polluted browser state', async () => {
  localStorage.setItem('calendarId', 'unrelated-calendar');
  localStorage.setItem('orderNumber', '999999');
  sessionStorage.setItem('e-advent-order-summary', JSON.stringify({ orderNumber: '999999', shipping: { street: 'Wrong 7' },
    items: Array.from({ length: 5 }, () => ({ sku: 'scratch-a3', name: 'Obcy produkt', quantity: 1, price: 69 })) }));
  show();
  await screen.findByText(/000042/);
  expect(screen.getByText(/Twoje zamówienie zostało przyjęte do realizacji/)).toBeTruthy();
  expect(screen.queryByText(/zamówienie Zamówienie/)).toBeNull();
  expect(screen.queryByText(/Zamówienie e-Advent/)).toBeNull();
  expect(screen.queryByText(/999999|Obcy produkt|Wrong 7/)).toBeNull();
  expect(screen.getByText(/Właściwa 1/)).toBeTruthy();
  expect(getCalendar).not.toHaveBeenCalled();
  expect(trackPurchase).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'canonical-order-uuid', value: 34,
    items: [expect.objectContaining({ sku: 'santa-letter', quantity: 1 })] }));
});
it('does not erase a new cart on return from an older payment', async () => {
  sessionStorage.setItem('e-advent-checkout-cart:pi_paid', '[{"id":"old"}]');
  localStorage.setItem('e-advent-cart', '[{"id":"new"}]');
  show(); await screen.findByText(/000042/);
  expect(localStorage.getItem('e-advent-cart')).toBe('[{"id":"new"}]');
});
it('does not claim success when API returns a different PaymentIntent', async () => {
  vi.mocked(getPaymentByIntentId).mockResolvedValue({ payment: { ...payment, stripePaymentIntentId: 'pi_other' }, stripeStatus: 'succeeded' });
  show(); await screen.findByText(/Nie udało się sprawdzić zamówienia/);
  expect(trackPurchase).not.toHaveBeenCalled();
  expect(screen.queryByText(/000042/)).toBeNull();
});
it('shows only purchased calendar links in a mixed physical/digital order', async () => {
  vi.mocked(getPaymentByIntentId).mockResolvedValue({ payment: { ...payment, items: [...payment.items,
    { sku: 'interactive', quantity: 1, unitPrice: 9, calendarId: 'my-calendar' }] }, stripeStatus: 'succeeded' });
  show();
  const link = await screen.findByText('Otwórz kalendarz 1');
  expect(link.getAttribute('href')).toBe('/kalendarz/my-calendar');
  expect(document.querySelector('a[href*="unrelated-calendar"]')).toBeNull();
});
it('clears a cart only when it is the exact snapshot of the completed checkout', async () => {
  const cart = '[{"id":"paid"}]';
  localStorage.setItem('e-advent-cart', cart);
  sessionStorage.setItem('e-advent-checkout-cart:pi_paid', cart);
  show(); await waitFor(() => expect(localStorage.getItem('e-advent-cart')).toBeNull());
});
it('clears a matching cart from the persisted BLIK checkout even without session snapshot', async () => {
  const cart = '[{"id":"paid","sku":"santa-letter","quantity":1}]';
  localStorage.setItem('e-advent-cart', cart);
  localStorage.setItem('e-advent-pending-checkout', JSON.stringify({
    paymentIntentId: 'pi_paid', orderId: 'canonical-order-uuid', clientSecret: 'secret', cartSnapshot: cart, createdAt: 1,
  }));
  show();
  await waitFor(() => expect(localStorage.getItem('e-advent-cart')).toBeNull());
  expect(localStorage.getItem('e-advent-pending-checkout')).toBeNull();
});
it('does not clear a physical cart when paying for a separate interactive calendar', async () => {
  localStorage.setItem('e-advent-cart', '[{"id":"unpaid-physical"}]');
  show(); await screen.findByText(/000042/);
  expect(localStorage.getItem('e-advent-cart')).toContain('unpaid-physical');
});

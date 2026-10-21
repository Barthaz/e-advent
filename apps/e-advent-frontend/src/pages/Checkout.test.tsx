import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPaymentIntent } from '../api/api';
import { saveShipping } from '../utils/creatorStorage';
import Checkout from './Checkout';

vi.mock('../api/api', () => ({ createPaymentIntent: vi.fn(), createCalendar: vi.fn(), validatePromoCode: vi.fn(), createFreeCalendar: vi.fn() }));
vi.mock('../utils/analytics', () => ({ trackBeginCheckout: vi.fn(), saveGaPurchasePayload: vi.fn() }));
vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn(() => Promise.resolve(null)) }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children, options }: { children: ReactNode; options: { clientSecret: string } }) => <div data-testid="stripe-form" data-secret={options.clientSecret}>{children}</div>,
  PaymentElement: () => <div />, useStripe: () => null, useElements: () => null,
}));
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('/quote') ? { price: 12, currency: 'PLN', profile: 'test', quoteKey: 'quote-1' } : { environment: 'sandbox', geowidgetToken: '' } })));
  localStorage.setItem('e-advent-cart', JSON.stringify([{ id: 'letter', sku: 'santa-letter', quantity: 1, customerEmail: 'buyer@example.com' }]));
  saveShipping('letter', { fullName: 'Anna Nowak', firstName: 'Anna', lastName: 'Nowak', buildingNumber: '1', street: 'Pierwsza', city: 'Warszawa', postalCode: '00-001', phone: '500600700', country: 'PL' });
  let count = 0;
  vi.mocked(createPaymentIntent).mockImplementation(async () => {
    count++;
    return { clientSecret: `secret-${count}`, paymentIntentId: `pi_${count}`, orderId: `uuid-${count}`, orderNumber: String(count).padStart(6, '0') };
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('hides the previous Stripe form immediately and uses the new intent after an address change', async () => {
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  fireEvent.click(screen.getByLabelText('Kurier InPost'));
  await waitFor(() => expect(screen.getByTestId('stripe-form').getAttribute('data-secret')).toBe('secret-1'), { timeout: 3000 });
  expect(localStorage.getItem('orderId')).toBe('uuid-1');
  expect(localStorage.getItem('orderNumber')).toBe('000001');
  fireEvent.change(screen.getByLabelText(/^Ulica/), { target: { value: 'Druga 2' } });
  expect(screen.queryByTestId('stripe-form')).toBeNull();
  await waitFor(() => expect(screen.getByTestId('stripe-form').getAttribute('data-secret')).toBe('secret-2'), { timeout: 3000 });
  expect(vi.mocked(createPaymentIntent).mock.calls[1][0].shippingAddress?.street).toBe('Druga 2');
  fireEvent.change(screen.getByLabelText(/^Ulica/), { target: { value: '' } });
  expect(screen.queryByTestId('stripe-form')).toBeNull();
});

it('locker requires a selected point and changing it replaces the payment', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('/quote')
    ? { price: 17, currency: 'PLN', profile: 'test', quoteKey: 'quote-locker' }
    : { environment: 'sandbox', geowidgetToken: 'test-public-token' } })));
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  await waitFor(() => expect(document.querySelector('inpost-geowidget')).not.toBeNull());
  expect(screen.queryByTestId('stripe-form')).toBeNull();
  expect(createPaymentIntent).not.toHaveBeenCalled();
  let select: (point: { name: string }) => void = () => {};
  const api = { changePointsType: vi.fn(), addPointSelectedCallback: (cb: typeof select) => { select = cb; } };
  act(() => document.querySelector('inpost-geowidget')?.dispatchEvent(new CustomEvent('inpost.geowidget.init', { detail: { api } })));
  expect(api.changePointsType).toHaveBeenCalledWith('PARCEL_LOCKER');
  act(() => select({ name: 'KRA01M' }));
  await waitFor(() => expect(screen.getByTestId('stripe-form')).not.toBeNull(), { timeout: 3000 });
  expect(vi.mocked(createPaymentIntent).mock.calls[0][0]).toMatchObject({ amount: 46, delivery: { type: 'parcel_inpost', pointId: 'KRA01M', quoteKey: 'quote-locker' } });
  act(() => select({ name: 'KRA02M' }));
  expect(screen.queryByTestId('stripe-form')).toBeNull();
  await waitFor(() => expect(vi.mocked(createPaymentIntent).mock.calls).toHaveLength(2), { timeout: 3000 });
  expect(vi.mocked(createPaymentIntent).mock.calls[1][0].delivery?.pointId).toBe('KRA02M');
});

it('does not open Stripe when shipping cannot be priced', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Brak cennika testowego.' }) })));
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  fireEvent.click(screen.getByLabelText('Kurier InPost'));
  await screen.findByText('Brak cennika testowego.');
  expect(screen.queryByTestId('stripe-form')).toBeNull();
  expect(createPaymentIntent).not.toHaveBeenCalled();
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CartProvider } from '../context/CartContext';
import CartPage from './CartPage';
import { readCheckoutEmail } from '../utils/checkoutDetails';

vi.mock('../utils/reconcileCheckout', () => ({ reconcilePendingCheckout: vi.fn(async () => null) }));
vi.mock('../utils/analytics', () => ({ trackAddToCart: vi.fn(), trackSantaEvent: vi.fn() }));
function Destination() { const location = useLocation(); return <p>Next: {location.search}</p>; }
function mount() {
  render(<MemoryRouter initialEntries={['/koszyk']}><CartProvider><Routes><Route path="/koszyk" element={<CartPage />} /><Route path="/platnosc" element={<Destination />} /></Routes></CartProvider></MemoryRouter>);
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('e-advent-cart', JSON.stringify([{ id: 'letter', sku: 'santa-letter', quantity: 1 }]));
});
afterEach(cleanup);

it('requires a valid email before entering delivery and preserves the trimmed contact', () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Dostawa i płatność' }));
  expect(screen.getByText(/Wpisz poprawny adres e-mail/)).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: 'Adres e-mail' }), { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: 'Dostawa i płatność' }));
  expect(screen.queryByText(/Next:/)).toBeNull();
  fireEvent.change(screen.getByRole('textbox', { name: 'Adres e-mail' }), { target: { value: ' parent@example.com ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Dostawa i płatność' }));
  expect(screen.getByText('Next: ?koszyk=1')).toBeTruthy();
  expect(readCheckoutEmail()).toBe('parent@example.com');
});

it('updates both product list and summary when quantity changes', () => {
  mount();
  fireEvent.change(screen.getByLabelText('Liczba listów'), { target: { value: '2' } });
  expect(screen.getAllByText('58 zł').length).toBeGreaterThan(1);
  expect(JSON.parse(localStorage.getItem('e-advent-cart')!)[0].quantity).toBe(2);
});

it('adds a named certificate to an existing voice bundle without adding another letter', () => {
  localStorage.setItem('e-advent-cart', JSON.stringify([
    { id: 'letter', sku: 'santa-letter', quantity: 1 },
    { id: 'voice', sku: 'voice-message-addon', quantity: 1 },
  ]));
  mount();
  fireEvent.click(screen.getByRole('button', { name: /Dodaj certyfikat z imieniem/ }));
  fireEvent.change(screen.getByLabelText('Imię dziecka na certyfikacie'), { target: { value: ' Zosia ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Dodaj za 9 zł' }));
  const cart = JSON.parse(localStorage.getItem('e-advent-cart')!);
  expect(cart.filter((item: { sku: string }) => item.sku === 'santa-letter')).toHaveLength(1);
  expect(cart.find((item: { sku: string }) => item.sku === 'voice-message-addon').quantity).toBe(1);
  expect(cart.find((item: { sku: string }) => item.sku === 'santa-certificate').childName).toBe('Zosia');
  expect(screen.getAllByText('57 zł').length).toBeGreaterThan(0);
});

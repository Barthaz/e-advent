import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { isCalendarsOnSale, isLetterPromoActive, LETTER_PROMO_CODE } from '../../config/products';
import CalendarWaitNotice from './CalendarWaitNotice';
import LetterPromoNotice from './LetterPromoNotice';

afterEach(cleanup);

it('opens calendar sales on 1 November and ends the letter promo at the same moment', () => {
  expect(isCalendarsOnSale(new Date('2026-10-31T22:59:59+01:00'))).toBe(false);
  expect(isLetterPromoActive(new Date('2026-10-31T23:59:59+01:00'))).toBe(true);
  expect(isCalendarsOnSale(new Date('2026-11-01T00:00:00+01:00'))).toBe(true);
  expect(isLetterPromoActive(new Date('2026-11-01T00:00:00+01:00'))).toBe(false);
});

it('tells calendar visitors they can order letters at 20% off while they wait', () => {
  render(
    <MemoryRouter>
      <CalendarWaitNotice />
    </MemoryRouter>,
  );
  expect(screen.getByText(/Zamówienia od 1 listopada/)).toBeTruthy();
  expect(screen.queryByText(/1 grudnia/)).toBeNull();
  expect(screen.getAllByText(LETTER_PROMO_CODE).length).toBeGreaterThan(0);
  expect(screen.getByRole('link', { name: /Zamów List do Mikołaja/ })).toBeTruthy();
});

it('shows only the letter promo on home and letter surfaces', () => {
  render(
    <MemoryRouter>
      <LetterPromoNotice />
    </MemoryRouter>,
  );
  expect(screen.getByText(/Listy i certyfikaty/)).toBeTruthy();
  expect(screen.getByText(/certyfikat 7.20 zł zamiast 9 zł/)).toBeTruthy();
  expect(screen.queryByText(/1 grudnia/)).toBeNull();
  expect(screen.getAllByText(LETTER_PROMO_CODE).length).toBeGreaterThan(0);
});

it('copies the promo code from the chip', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  render(
    <MemoryRouter>
      <LetterPromoNotice />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: new RegExp(LETTER_PROMO_CODE) }));
  expect(writeText).toHaveBeenCalledWith(LETTER_PROMO_CODE);
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { CartProvider } from '../context/CartContext';
import { loadCart } from '../utils/cartStorage';
import CreatorInteractive from './CreatorInteractive';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

it('adds two independently personalized calendars alongside a letter and preserves the existing draft', async () => {
  localStorage.setItem('e-advent-cart', JSON.stringify([{ id: 'letter', sku: 'santa-letter', quantity: 1 }]));
  localStorage.setItem('e-advent-pending-calendar-id', 'other-draft');
  const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
    const { calendar } = JSON.parse(String(options.body));
    expect(options.method).toBe('POST');
    expect(calendar.tasks).toHaveLength(24);
    expect(calendar.openingMethod).toBe('online');
    return { ok: true, json: async () => ({ calendar: { id: calendar.title }, editToken: 'token-' + calendar.title }) };
  });
  vi.stubGlobal('fetch', fetchMock);

  for (const title of ['Pierwszy', 'Drugi']) {
    const { unmount } = render(<MemoryRouter><CartProvider><CreatorInteractive /></CartProvider></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('Jan'), { target: { value: 'Anna' } });
    fireEvent.change(screen.getByPlaceholderText('jan@example.com'), { target: { value: title + '@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Mój Kalendarz Adwentowy'), { target: { value: title } });
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    for (const checkbox of screen.getAllByRole('checkbox')) {
      if (!(checkbox as HTMLInputElement).checked) fireEvent.click(checkbox);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('radio', { name: /Otwieranie online/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj do koszyka' }));
    await screen.findByRole('button', { name: /Kontynuuj zakupy/ });
    expect(localStorage.getItem('e-advent-edit-token:' + title)).toBe('token-' + title);
    unmount();
  }
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(localStorage.getItem('e-advent-pending-calendar-id')).toBe('other-draft');
  expect(loadCart().map(item => [item.sku, item.calendarId, item.quantity])).toEqual([
    ['santa-letter', undefined, 1], ['interactive', 'Pierwszy', 1], ['interactive', 'Drugi', 1],
  ]);
});

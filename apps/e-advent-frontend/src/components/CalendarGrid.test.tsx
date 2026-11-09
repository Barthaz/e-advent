import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import CalendarGrid from './CalendarGrid';
import DemoCalendar from './DemoCalendar';

afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

it('keeps future windows locked and opened windows accessible for replay', () => {
  const open = vi.fn();
  render(<CalendarGrid currentDate={new Date(2026, 11, 2)} onDayClick={open} days={[
    { day: 1, task: 'Herbata', isOpened: true, date: new Date(2026, 11, 1).toISOString() },
    { day: 2, task: 'Spacer', isOpened: false, date: new Date(2026, 11, 2).toISOString() },
    { day: 3, task: 'List', isOpened: false, date: new Date(2026, 11, 3).toISOString() },
  ]} />);
  fireEvent.click(screen.getByRole('button', { name: /1 grudnia — otwarte/ }));
  fireEvent.click(screen.getByRole('button', { name: /2 grudnia — otwórz/ }));
  const locked = screen.getByRole('button', { name: /3 grudnia — dostępne/ }) as HTMLButtonElement;
  expect(locked.disabled).toBe(true);
  fireEvent.click(locked);
  expect(open.mock.calls).toEqual([[1], [2]]);
});

it('counts only actually opened free windows and persists progress', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 11, 2, 12));
  render(<DemoCalendar />);
  expect(screen.getByText('0 / 24 odkrytych chwil')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /1 grudnia — otwórz/ }));
  expect(screen.getByText('1 / 24 odkrytych chwil')).toBeTruthy();
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(JSON.parse(localStorage.getItem('public-demo-calendar')!).filter((d: { isOpened: boolean }) => d.isOpened)).toHaveLength(1);
});

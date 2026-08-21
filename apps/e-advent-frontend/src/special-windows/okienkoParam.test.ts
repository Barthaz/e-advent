import { describe, expect, it } from 'vitest';
import { isDayUnlockedByDate, parseOkienkoParam } from './okienkoParam';

describe('parseOkienkoParam', () => {
  it('accepts integers 1–24', () => {
    expect(parseOkienkoParam('1')).toBe(1);
    expect(parseOkienkoParam('6')).toBe(6);
    expect(parseOkienkoParam('24')).toBe(24);
    expect(parseOkienkoParam('01')).toBe(1);
    expect(parseOkienkoParam(' 4 ')).toBe(4);
  });

  it('rejects malformed or out-of-range values', () => {
    expect(parseOkienkoParam(null)).toBeNull();
    expect(parseOkienkoParam(undefined)).toBeNull();
    expect(parseOkienkoParam('')).toBeNull();
    expect(parseOkienkoParam('0')).toBeNull();
    expect(parseOkienkoParam('25')).toBeNull();
    expect(parseOkienkoParam('17a')).toBeNull();
    expect(parseOkienkoParam('4.0')).toBeNull();
    expect(parseOkienkoParam('-1')).toBeNull();
    expect(parseOkienkoParam('abc')).toBeNull();
  });
});

describe('isDayUnlockedByDate', () => {
  const dec = (day: number) => new Date(2026, 11, day).toISOString();

  it('allows an already opened window even if its date is in the future', () => {
    expect(
      isDayUnlockedByDate({ isOpened: true, date: dec(17) }, new Date(2026, 11, 6))
    ).toBe(true);
  });

  it('allows today and past windows', () => {
    expect(
      isDayUnlockedByDate({ isOpened: false, date: dec(6) }, new Date(2026, 11, 6))
    ).toBe(true);
    expect(
      isDayUnlockedByDate({ isOpened: false, date: dec(1) }, new Date(2026, 11, 6))
    ).toBe(true);
  });

  it('blocks a future window (e.g. 17 while current is 6)', () => {
    expect(
      isDayUnlockedByDate({ isOpened: false, date: dec(17) }, new Date(2026, 11, 6))
    ).toBe(false);
  });

  it('blocks unopened December windows outside advent', () => {
    expect(
      isDayUnlockedByDate({ isOpened: false, date: dec(6) }, new Date(2026, 7, 17))
    ).toBe(false);
  });
});

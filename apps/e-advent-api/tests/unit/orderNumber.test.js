const { formatOrderNumber, parseOrderNumberSearch } = require('../../utils/orderNumber');

describe('orderNumber utils', () => {
  test('formatOrderNumber pads to 6 digits', () => {
    expect(formatOrderNumber(1)).toBe('000001');
    expect(formatOrderNumber(42)).toBe('000042');
    expect(formatOrderNumber(999999)).toBe('999999');
    expect(formatOrderNumber('7')).toBe('000007');
    expect(formatOrderNumber(null)).toBeNull();
    expect(formatOrderNumber(0)).toBeNull();
  });

  test('parseOrderNumberSearch accepts padded and hashed input', () => {
    expect(parseOrderNumberSearch('000001')).toBe(1);
    expect(parseOrderNumberSearch('#42')).toBe(42);
    expect(parseOrderNumberSearch('  000007  ')).toBe(7);
    expect(parseOrderNumberSearch('abc')).toBeNull();
  });
});

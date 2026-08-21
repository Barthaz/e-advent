const { getAdventDay } = require('../../services/adventDay');

describe('adventDay', () => {
  test('returns day 1–24 in December Warsaw time', () => {
    const result = getAdventDay(new Date('2026-12-05T12:00:00+01:00'));
    expect(result).toEqual({ day: 5, year: 2026 });
  });

  test('returns null outside 1–24 December', () => {
    expect(getAdventDay(new Date('2026-11-30T12:00:00+01:00'))).toBeNull();
    expect(getAdventDay(new Date('2026-12-25T12:00:00+01:00'))).toBeNull();
    expect(getAdventDay(new Date('2026-08-14T12:00:00+02:00'))).toBeNull();
  });
});

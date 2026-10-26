const { warsawWallClockToUtc } = require('../../utils/warsawTime');

describe('warsawWallClockToUtc', () => {
  test('converts winter Warsaw noon to UTC', () => {
    expect(warsawWallClockToUtc(new Date('2026-01-15T12:00:00.000Z')).toISOString()).toBe('2026-01-15T11:00:00.000Z');
  });
  test('converts summer Warsaw afternoon to UTC', () => {
    expect(warsawWallClockToUtc(new Date('2026-07-01T14:00:00.000Z')).toISOString()).toBe('2026-07-01T12:00:00.000Z');
  });
  test('converts the day after October DST ends', () => {
    expect(warsawWallClockToUtc(new Date('2026-10-26T12:44:14.000Z')).toISOString()).toBe('2026-10-26T11:44:14.000Z');
  });
});

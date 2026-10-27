const { currentSeason, warsawTodayRange } = require('../../services/adminDashboard');

function warsawHour(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

describe('admin season window', () => {
  test('October belongs to the current Christmas season', () => {
    const season = currentSeason(new Date('2026-10-27T11:00:00Z'));
    expect(season.year).toBe(2026);
    expect(season.label).toBe('Sezon 2026');
    expect(warsawHour(season.from)).toBe('01/01/2026, 00:00');
    expect(warsawHour(season.to)).toBe('02/01/2027, 00:00');
  });

  test('January still belongs to the previous season', () => {
    const season = currentSeason(new Date('2027-01-15T11:00:00Z'));
    expect(season.year).toBe(2026);
    expect(warsawHour(season.from)).toBe('01/01/2026, 00:00');
  });

  test('today is the Warsaw calendar day', () => {
    const range = warsawTodayRange(new Date('2026-10-27T22:30:00Z'));
    expect(warsawHour(range.from)).toBe('10/27/2026, 00:00');
    expect(warsawHour(range.to)).toBe('10/28/2026, 00:00');
  });
});

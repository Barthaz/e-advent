const WARSAW_TZ = 'Europe/Warsaw';

/**
 * Numer dnia adwentu (1–24) według daty w strefie Europe/Warsaw.
 * Poza 1–24 grudnia zwraca null.
 */
function getAdventDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WARSAW_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = Number(p.value);
  }

  if (map.month !== 12 || map.day < 1 || map.day > 24) {
    return null;
  }

  return { day: map.day, year: map.year };
}

function getAdventDayOrThrow(now = new Date()) {
  const advent = getAdventDay(now);
  if (!advent) {
    const err = new Error('Poza okresem adwentu (1–24 grudnia) nie ma dzisiejszego okienka.');
    err.code = 'NOT_ADVENT';
    throw err;
  }
  return advent;
}

module.exports = {
  WARSAW_TZ,
  getAdventDay,
  getAdventDayOrThrow,
};

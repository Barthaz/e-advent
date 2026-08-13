/** Strip diacritics and normalize for city name matching (PL-friendly). */
export function normalizeCityName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9\s'-]/g, '')
    .replace(/\s+/g, ' ');
}

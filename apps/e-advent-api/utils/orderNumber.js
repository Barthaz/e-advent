/**
 * Publiczny numer zamówienia: liczba całkowita → 6 pozycji z zerami wiodącymi.
 * Przykład: 1 → "000001"
 */
function formatOrderNumber(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, ''), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return String(n).padStart(6, '0');
}

/**
 * Wyciąga liczbę z wpisu wyszukiwania ("000001", "#1", "1").
 */
function parseOrderNumberSearch(raw) {
  if (raw == null) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

module.exports = {
  formatOrderNumber,
  parseOrderNumberSearch,
};

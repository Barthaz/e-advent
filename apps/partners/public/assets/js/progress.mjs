export const KEY = 'soa_advent_2026_progress_v1';
export function readProgress(storage) {
  try { const data = JSON.parse(storage.getItem(KEY) || '{}'); return new Set((Array.isArray(data.openedDays) ? data.openedDays : []).filter(n => Number.isInteger(n) && n >= 1 && n <= 24)); }
  catch { return new Set(); }
}
export function saveProgress(storage, days) {
  try { storage.setItem(KEY, JSON.stringify({ version: 1, openedDays: [...days].sort((a,b) => a-b) })); return true; }
  catch { return false; }
}

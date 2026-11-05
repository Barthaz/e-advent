import type { PurchaseMode } from './validation';

const STORAGE_KEY = 'e-advent-santa-draft';

/** Only identifiers are kept in the browser; the child's data lives encrypted on the server. */
export interface StoredDraft {
  id: string;
  key: string;
  mode: PurchaseMode;
}

export function loadStoredDraft(): StoredDraft | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as StoredDraft | null;
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.key !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredDraft(draft: StoredDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* storage blocked: the draft still works for this session through the cart */
  }
}

export function clearStoredDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

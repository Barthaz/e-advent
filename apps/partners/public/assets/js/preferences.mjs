export const PREFERENCES_KEY = 'soa_privacy_preferences';
export const PREFERENCES_LIFETIME = 180 * 24 * 60 * 60 * 1000;
export function readPreferences(storage, version, now = Date.now()) {
  try {
    const choice = JSON.parse(storage.getItem(PREFERENCES_KEY));
    if (!choice || choice.version !== version || !Number.isFinite(choice.expires)
      || choice.expires <= now || typeof choice.history !== 'boolean'
      || typeof choice.analytics !== 'boolean') return null;
    return { history: choice.history, analytics: choice.analytics };
  } catch { return null; }
}
export function writePreferences(storage, version, choice, now = Date.now()) {
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify({ version, history: choice.history === true,
      analytics: choice.analytics === true, expires: now + PREFERENCES_LIFETIME }));
    return true;
  } catch { return false; }
}

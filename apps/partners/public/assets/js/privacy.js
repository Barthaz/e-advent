import { PREFERENCES_KEY, readPreferences, writePreferences } from './preferences.mjs';
import { KEY as HISTORY_KEY } from './progress.mjs';
const panel = document.querySelector('[data-privacy]');
const version = panel.dataset.version;
export const analyticsAvailable = panel.dataset.analytics === 'true';
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let choice = readPreferences(storage, version);
let returnFocus;
const historyInput = document.querySelector('#privacy-history');
const analyticsInput = document.querySelector('#privacy-analytics');
const options = document.querySelector('#privacy-options');
const customize = document.querySelector('#privacy-customize');
export function getChoices() { return choice || { history: false, analytics: false }; }
export function onChoicesChange(callback) { window.addEventListener('soa:privacy', () => callback(getChoices())); }
function syncInputs() {
  // A suggested form value is not consent: getChoices() stays off until save().
  historyInput.checked = choice?.history ?? true;
  analyticsInput.checked = analyticsAvailable && getChoices().analytics;
}
function showOptions(show) {
  options.hidden = !show;
  document.querySelector('#privacy-accept').hidden = show;
  customize.setAttribute('aria-expanded', String(show));
  customize.textContent = show ? 'Wróć do wyboru' : 'Dostosuj ustawienia';
}
function announce(message) {
  document.querySelector('#privacy-feedback').textContent = message;
  document.querySelector('#privacy-footer-status').textContent = message;
}
function save(history, analytics) {
  choice = { history, analytics: analyticsAvailable && analytics };
  const persisted = writePreferences(storage, version, choice);
  if (!choice.history) { try { storage?.removeItem(HISTORY_KEY); } catch {} }
  try { storage?.removeItem(`soa_analytics_choice_${version.split(':')[0]}`); } catch {}
  window.dispatchEvent(new CustomEvent('soa:privacy'));
  syncInputs();
  panel.hidden = true;
  announce(persisted ? 'Ustawienia prywatności zostały zapisane.' : 'Wybór obowiązuje w tej karcie. Przeglądarka nie pozwala zapisać go na kolejną wizytę.');
  (returnFocus || document.querySelector('#main'))?.focus();
}
document.querySelector('#privacy-accept').addEventListener('click', () => save(true, analyticsAvailable));
document.querySelector('#privacy-reject').addEventListener('click', () => save(false, false));
document.querySelector('#privacy-save').addEventListener('click', () => save(historyInput.checked, analyticsInput.checked));
customize.addEventListener('click', () => showOptions(options.hidden));
document.querySelectorAll('[data-privacy-open]').forEach(button => {
  button.hidden = false;
  button.addEventListener('click', () => {
    returnFocus = button;
    syncInputs(); showOptions(true); panel.hidden = false;
    document.querySelector('#privacy-title').focus();
  });
});
window.addEventListener('storage', event => {
  if (event.key !== PREFERENCES_KEY && event.key !== null) return;
  choice = readPreferences(storage, version);
  syncInputs(); showOptions(false);
  panel.hidden = choice !== null;
  window.dispatchEvent(new CustomEvent('soa:privacy'));
});
window.addEventListener('soa:analytics-status', event => announce(event.detail));
syncInputs();
panel.hidden = choice !== null;

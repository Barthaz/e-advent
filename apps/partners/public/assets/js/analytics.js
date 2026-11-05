import { getChoices, onChoicesChange, analyticsAvailable } from './privacy.js';
let token = null;
let revision = 0;
let pendingChoice = Promise.resolve();
let viewTracked = false;
function choose(grant) {
  const current = ++revision;
  token = null;
  // Serialize consent changes so a slow grant cannot overwrite a later withdrawal.
  pendingChoice = pendingChoice.then(() => sendChoice(analyticsAvailable && grant, current));
}
async function sendChoice(grant, current) {
  try {
    const response = await fetch('/api/consent.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grant }) });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (current !== revision) return;
    token = data.token || null;
    if (grant && !viewTracked && document.querySelector('[data-calendar]')) { track('page_view'); viewTracked = true; }
  } catch {
    if (current === revision) window.dispatchEvent(new CustomEvent('soa:analytics-status', {
      detail: 'Wysyłanie statystyk w tej karcie jest wyłączone. Nie udało się potwierdzić wyboru na serwerze; spróbuj ponownie w ustawieniach prywatności.'
    }));
  }
}
function track(event, day) {
  if (!analyticsAvailable || !getChoices().analytics || !token) return;
  fetch('/api/track.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: JSON.stringify({ event, ...(day ? { windowDay: day } : {}) }), keepalive: true }).catch(() => {});
}
onChoicesChange(choice => choose(choice.analytics));
window.addEventListener('soa:open', event => track('window_open', event.detail.day));
if (analyticsAvailable && getChoices().analytics) choose(true);

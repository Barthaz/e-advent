import { readProgress, saveProgress, KEY } from './progress.mjs';
import { getChoices, onChoicesChange } from './privacy.js';
let storage;
try { storage = window.localStorage; } catch { storage = null; }
const opened = getChoices().history ? readProgress(storage) : new Set();
const root = document.querySelector('[data-calendar]');
const dialog = document.querySelector('#task-dialog');
const status = document.querySelector('#calendar-status');
let activeButton, busy = false;
let tasks = JSON.parse(root.dataset.tasks || '{}');
let state = { phase: root.dataset.phase, available: Number(root.dataset.available) };
// The server supplies today's tasks with the page and the time to the next Warsaw midnight.
let refreshAt = Date.now() + Number(root.dataset.refreshAfter || 0) * 1000;
let pendingRefresh;
function paint() {
  document.querySelector('.calendar-grid').hidden = state.phase === 'ended';
  for (const button of document.querySelectorAll('[data-day]')) {
    const day = Number(button.dataset.day), available = day <= state.available;
    const seen = opened.has(day) && available;
    button.setAttribute('aria-disabled', String(!available));
    button.classList.toggle('opened', seen);
    button.querySelector('.tile-title').textContent = seen ? tasks[day]?.title || 'Przeczytaj ponownie' : '';
    button.setAttribute('aria-label', `Dzień ${day}, ${seen ? 'otwarte, przeczytaj ponownie' : available ? 'dostępne, nieotwarte' : `dostępny od ${day} grudnia`}`);
  }
  const count = [...opened].filter(d => d <= state.available).length;
  document.querySelector('#progress-count').textContent = count;
  document.querySelector('#calendar-progress').value = count;
  document.querySelector('#calendar-progress').textContent = `${count} z 24`;
}
async function fetchCalendar() {
  const response = await fetch('/api/calendar.php', { cache: 'no-store' });
  if (!response.ok) throw new Error('calendar');
  const data = await response.json(); state = data.state; tasks = data.tasks; paint();
  refreshAt = Date.now() + state.refreshAfter * 1000;
  status.textContent = state.phase === 'upcoming' ? 'Zaczynamy 1 grudnia' : state.phase === 'ended' ? 'Dziękujemy za wspólny grudzień. Kalendarz zakończył działanie.' : state.available === 1 ? 'Dostępne okienko: 1' : `Dostępne okienka: 1–${state.available}`;
  if (state.phase !== 'active' && dialog.open) dialog.close();
}
async function refresh() {
  if (Date.now() < refreshAt) return;
  pendingRefresh ??= fetchCalendar().finally(() => { pendingRefresh = undefined; });
  await pendingRefresh;
}
async function revealWindow(button) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  button.classList.add('opening');
  // Listen before the next paint; the timeout also handles a hidden tab or cancelled animation.
  await new Promise(resolve => {
    const finish = () => {
      clearTimeout(timeout);
      button.removeEventListener('animationend', onEnd);
      resolve();
    };
    const onEnd = event => { if (event.animationName === 'window-peel') finish(); };
    const timeout = setTimeout(finish, 650);
    button.addEventListener('animationend', onEnd);
  });
  button.classList.remove('opening');
}
for (const button of document.querySelectorAll('[data-day]')) button.addEventListener('click', async () => {
  if (busy) return;
  const day = Number(button.dataset.day);
  busy = true; button.setAttribute('aria-busy', 'true');
  try {
    await refresh();
    const task = tasks[day];
    if (!task) { status.textContent = state.phase === 'ended' ? 'Kalendarz zakończył działanie.' : `To okienko będzie dostępne od ${day} grudnia.`; return; }
    document.querySelector('#task-title').textContent = task.title;
    document.querySelector('#task-body').textContent = task.body;
    document.querySelector('#task-date').textContent = `${day} grudnia 2026`;
    document.querySelector('#task-duration').textContent = task.minutes || 'Chwila dla Ciebie';
    const firstOpening = !opened.has(day);
    opened.add(day);
    if (getChoices().history && !saveProgress(storage, opened)) document.querySelector('#storage-status').textContent = 'Przeglądarka nie pozwala zapisać historii. Kalendarz nadal działa, a okienka pozostaną dostępne.';
    paint();
    if (firstOpening) await revealWindow(button);
    if (state.phase !== 'active' || day > state.available) return;
    activeButton = button; dialog.showModal();
    window.dispatchEvent(new CustomEvent('soa:open', { detail: { day } }));
  } catch { status.textContent = 'Nie udało się pobrać zadania. Sprawdź połączenie i spróbuj ponownie.'; }
  finally { busy = false; button.removeAttribute('aria-busy'); button.classList.remove('opening'); }
});
document.querySelectorAll('.dialog-close,.dialog-done').forEach(b => b.addEventListener('click', () => dialog.close()));
dialog.addEventListener('close', () => activeButton?.focus());
document.querySelector('#reset-progress').addEventListener('click', () => {
  if (!confirm('Wyczyścić historię otwarć w tej przeglądarce? Zadania pozostaną dostępne.')) return;
  opened.clear(); try { storage?.removeItem(KEY); } catch {} paint();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh().catch(() => {}); });
onChoicesChange(choice => {
  if (choice.history) {
    for (const day of readProgress(storage)) opened.add(day);
    if (!saveProgress(storage, opened)) document.querySelector('#storage-status').textContent = 'Nie udało się zapisać historii w tej przeglądarce.';
  } else {
    try { storage?.removeItem(KEY); } catch {}
    document.querySelector('#storage-status').textContent = '';
  }
  paint();
});
setInterval(() => { if (!document.hidden) refresh().catch(() => {}); }, 60000);
paint();
refresh().catch(() => {});

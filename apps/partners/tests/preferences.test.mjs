import test from 'node:test';
import assert from 'node:assert/strict';
import { readPreferences, writePreferences, PREFERENCES_LIFETIME } from '../public/assets/js/preferences.mjs';
const version = '2026:local';
function memory() { let value = null; return { getItem: () => value, setItem: (_, next) => { value = next; } }; }
test('missing, malformed or blocked storage never grants consent', () => {
  for (const storage of [null, memory(), { getItem: () => '{broken' }, { getItem: () => '{"history":true,"analytics":true}' }]) {
    assert.equal(readPreferences(storage, version), null);
  }
  assert.equal(writePreferences(null, version, { history: true, analytics: true }), false);
});
test('history and analytics choices are independent; refusal is remembered', () => {
  const storage = memory();
  for (const choice of [{ history: true, analytics: false }, { history: false, analytics: true }, { history: false, analytics: false }]) {
    assert.equal(writePreferences(storage, version, choice, 1000), true);
    assert.deepEqual(readPreferences(storage, version, 2000), choice);
  }
});
test('expiry and enabling analytics require a fresh choice', () => {
  const storage = memory();
  writePreferences(storage, version, { history: true, analytics: false }, 1000);
  assert.equal(readPreferences(storage, version, 1000 + PREFERENCES_LIFETIME), null);
  assert.equal(readPreferences(storage, '2026:analytics', 2000), null);
});

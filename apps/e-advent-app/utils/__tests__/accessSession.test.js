const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAccessSessionFromApi,
  assertCalendarIdMatchesApi,
  STORAGE_KEYS,
} = require('../accessSession');

describe('accessSession (C-07 / UT-16)', () => {
  it('does not build session without calendarId from API', () => {
    assert.equal(
      buildAccessSessionFromApi({
        email: 'a@b.c',
        accessCode: 'ABC123',
        calendarId: null,
      }),
      null
    );
  });

  it('builds session only from successful API fields', () => {
    assert.deepEqual(
      buildAccessSessionFromApi({
        email: 'A@B.C',
        accessCode: 'abc123',
        calendarId: 'server-uuid-1',
      }),
      {
        email: 'a@b.c',
        accessCode: 'ABC123',
        calendarId: 'server-uuid-1',
      }
    );
  });

  it('rejects injected foreign calendarId vs API id', () => {
    assert.equal(assertCalendarIdMatchesApi('attacker-id', 'server-uuid-1'), false);
    assert.equal(assertCalendarIdMatchesApi('server-uuid-1', 'server-uuid-1'), true);
    assert.equal(assertCalendarIdMatchesApi(null, 'server-uuid-1'), true);
  });

  it('exposes calendarId storage key', () => {
    assert.equal(STORAGE_KEYS.calendarId, '@e_advent_calendar_id');
    assert.equal(STORAGE_KEYS.email, '@e_advent_calendar_email');
  });
});

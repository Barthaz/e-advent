/**
 * Pure helpers for calendar access session (unit-tested).
 * Keeps sensitive session writes out of failed-login paths.
 */

const STORAGE_KEYS = {
  email: '@e_advent_calendar_email',
  accessCode: '@e_advent_calendar_access_code',
  calendarId: '@e_advent_calendar_id',
  openedDays: '@e_advent_calendar_opened_days',
};

/** Only persist session after a successful API access response. */
function buildAccessSessionFromApi({ email, accessCode, calendarId }) {
  if (!email || !accessCode || !calendarId) {
    return null;
  }
  return {
    email: String(email).trim().toLowerCase(),
    accessCode: String(accessCode).trim().toUpperCase(),
    calendarId: String(calendarId),
  };
}

/** Reject injecting a different calendarId than the one returned by the API. */
function assertCalendarIdMatchesApi(storedOrRequestedId, apiCalendarId) {
  if (!storedOrRequestedId) return true;
  return String(storedOrRequestedId) === String(apiCalendarId);
}

module.exports = {
  STORAGE_KEYS,
  buildAccessSessionFromApi,
  assertCalendarIdMatchesApi,
};

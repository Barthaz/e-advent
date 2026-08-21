const crypto = require('crypto');

function verifyEditToken(calendar, token) {
  if (!calendar || !calendar.editToken || !token) return false;
  const a = Buffer.from(String(calendar.editToken));
  const b = Buffer.from(String(token));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyAccessCode(calendar, accessCode) {
  if (!calendar || !calendar.accessCode || !accessCode) return false;
  return String(calendar.accessCode).toUpperCase() === String(accessCode).trim().toUpperCase();
}

module.exports = {
  createCalendar: jest.fn(),
  findCalendarById: jest.fn(),
  findCalendarByEmailAndAccessCode: jest.fn(),
  hasActiveCalendarAccount: jest.fn(),
  verifyEditToken,
  verifyAccessCode,
  updateCalendar: jest.fn(),
  updateCalendarData: jest.fn(),
  upsertCalendar: jest.fn(),
  findCalendars: jest.fn(),
  findEmailOpeningCalendars: jest.fn(),
  openTask: jest.fn(),
  generateEditToken: jest.fn(() => 'generated-edit-token'),
};

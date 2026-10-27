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
  findGeneratedCalendars: jest.fn(),
  countGeneratedCalendars: jest.fn(),
  setCalendarOrigin: jest.fn(),
  calendarRowToAdminJson: jest.fn((row) => {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      email: row.email,
      productType: row.product_type,
      sku: row.sku,
      format: row.format,
      designUrl: row.design_url,
      tasks: typeof row.tasks === 'string' ? JSON.parse(row.tasks) : (row.tasks || []),
      status: row.status,
      accessCode: row.access_code,
      isFree: !!row.is_free,
      fulfillmentStatus: row.fulfillment_status,
      fulfillmentNotes: row.fulfillment_notes,
      openingMethod: row.opening_method || null,
      dailyContentEmail: row.daily_content_email || null,
      origin: row.origin === 'generator' ? 'generator' : 'store',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }),
  openTask: jest.fn(),
  generateEditToken: jest.fn(() => 'generated-edit-token'),
};

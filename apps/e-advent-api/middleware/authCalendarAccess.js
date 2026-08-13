const Calendar = require('../models/Calendar');
const Collaboration = require('../models/Collaboration');

/**
 * Authenticates consumer requests using calendar email + access code.
 * Credentials from headers (preferred) or dedicated body fields:
 *   X-Access-Email / X-Access-Code
 *   body.accessEmail / body.accessCode
 * Note: body.email is NOT used (reserved for invite payloads).
 */
async function authCalendarAccess(req, res, next) {
  try {
    const emailRaw =
      req.headers['x-access-email'] ||
      req.body?.accessEmail ||
      req.query?.accessEmail;
    const accessCodeRaw =
      req.headers['x-access-code'] ||
      req.body?.accessCode ||
      req.query?.accessCode;

    const email = Collaboration.normalizeEmail(emailRaw);
    const accessCode = String(accessCodeRaw || '').trim();

    if (!email || !email.includes('@') || !accessCode) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Wymagany adres email i kod dostępu.',
      });
    }

    const calendar = await Calendar.findCalendarByEmailAndAccessCode(email, accessCode);
    if (!calendar) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Nieprawidłowy email lub kod dostępu.',
      });
    }

    if (calendar.status !== 'succeeded') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Kalendarz nie jest aktywny.',
      });
    }

    req.profile = {
      email: Collaboration.normalizeEmail(calendar.data?.email || email),
      calendarId: calendar.id || calendar._id,
      calendar,
    };
    next();
  } catch (err) {
    console.error('authCalendarAccess error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Nie udało się zweryfikować dostępu.',
    });
  }
}

module.exports = authCalendarAccess;

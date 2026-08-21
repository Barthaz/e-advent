const express = require('express');
const router = express.Router();
const { sendEmail } = require('../config/email');
const { body, validationResult } = require('express-validator');
const authAdmin = require('../middleware/authAdmin');
const { frontendUrl } = require('../config/app');
const {
  buildInteractiveAccessEmail,
  buildInteractiveAccessEmailText,
} = require('../services/orderEmails');

router.post('/send', authAdmin, [
  body('to').isEmail().withMessage('Valid recipient email is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('text').optional().isString(),
  body('html').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { to, subject, text, html } = req.body;

    if (!text && !html) {
      return res.status(400).json({ error: 'Either text or html content is required' });
    }

    const result = await sendEmail({ to, subject, text, html });

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

router.post('/send-bulk', authAdmin, [
  body('recipients').isArray().withMessage('Recipients must be an array'),
  body('recipients.*').isEmail().withMessage('Each recipient must be a valid email'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('text').optional().isString(),
  body('html').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipients, subject, text, html } = req.body;

    if (!text && !html) {
      return res.status(400).json({ error: 'Either text or html content is required' });
    }

    const results = [];
    const emailErrors = [];

    for (const recipient of recipients) {
      try {
        const result = await sendEmail({ to: recipient, subject, text, html });
        results.push({ recipient, success: true, messageId: result.messageId });
      } catch (error) {
        emailErrors.push({ recipient, error: error.message });
      }
    }

    res.json({
      success: true,
      sent: results.length,
      failed: emailErrors.length,
      results,
      errors: emailErrors.length > 0 ? emailErrors : undefined,
    });
  } catch (error) {
    console.error('Error sending bulk emails:', error);
    res.status(500).json({ error: 'Failed to send bulk emails', details: error.message });
  }
});

async function sendCalendarAccessEmail(req, res) {
  try {
    const { email, name, calendarLink, calendarData } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!calendarLink) {
      return res.status(400).json({ error: 'Calendar link is required' });
    }

    const calendarTitle = calendarData?.calendarTitle || calendarData?.title || name || 'Twój Kalendarz Adwentowy';
    const accessCode = calendarData?.accessCode || calendarData?.access_code || '';
    const emailSubject = `🎄 Twój Kalendarz Adwentowy: ${calendarTitle}`;
    const emailHtml = buildInteractiveAccessEmail({
      calendarTitle,
      calendarLink,
      accessCode: accessCode || '—',
      subtitle: 'Twój kalendarz jest gotowy',
    });
    const emailText = buildInteractiveAccessEmailText({ calendarTitle, calendarLink, accessCode: accessCode || '—' });

    const result = await sendEmail({
      to: email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}

router.post('/send-email', authAdmin, sendCalendarAccessEmail);
router.post('/', authAdmin, sendCalendarAccessEmail);

router.get('/test/:email', authAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const calendarLink = `${frontendUrl}/kalendarz/test-123`;
    const calendarTitle = 'Przykładowy Kalendarz Adwentowy';
    const accessCode = 'TEST01';
    const emailSubject = `🎄 [TEST] Twój Kalendarz Adwentowy: ${calendarTitle}`;
    const emailHtml = buildInteractiveAccessEmail({
      calendarTitle,
      calendarLink,
      accessCode,
      subtitle: 'TEST EMAIL',
    });
    const emailText = `[TEST]\n\n${buildInteractiveAccessEmailText({ calendarTitle, calendarLink, accessCode })}`;

    const result = await sendEmail({
      to: email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      email,
      calendarLink,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email', details: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { sendEmail } = require('../config/email');
const { body, validationResult } = require('express-validator');
const authAdmin = require('../middleware/authAdmin');
const { frontendUrl, emailLogoUrl } = require('../config/app');

// Send email
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

    const result = await sendEmail({
      to,
      subject,
      text,
      html,
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
});

// Send bulk emails
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
        const result = await sendEmail({
          to: recipient,
          subject,
          text,
          html,
        });
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

// Endpoint /api/send-email (alternatywna ścieżka dla kompatybilności)
// Przyjmuje dane w formacie: { email, name, calendarLink, calendarData }
router.post('/send-email', async (req, res) => {
    try {
        const { email, name, calendarLink, calendarData } = req.body;

        // Walidacja
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        if (!calendarLink) {
            return res.status(400).json({ error: 'Calendar link is required' });
        }

        // Wyciągnij dane kalendarza
        const calendarTitle = calendarData?.calendarTitle || calendarData?.title || name || 'Twój Kalendarz Adwentowy';
        const customerName = name || calendarData?.name || 'Klient';

        // Logo URL z env (config/app)
        const logoUrl = emailLogoUrl;

        // Przygotuj treść emaila z zielono-złotym motywem
        const emailSubject = `🎄 Twój Kalendarz Adwentowy: ${calendarTitle}`;
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Georgia', 'Times New Roman', serif;
                        line-height: 1.8;
                        background: #f5f5f5;
                        padding: 40px 20px;
                    }
                    .email-container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: #2E7D32;
                        border: 4px solid #FFD700;
                        border-radius: 20px;
                        padding: 50px 40px;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    }
                    .logo-container {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    .logo {
                        max-width: 250px;
                        height: auto;
                        display: block;
                        margin: 0 auto;
                    }
                    .content {
                        text-align: center;
                        color: #ffffff;
                    }
                    .greeting {
                        font-size: 24px;
                        color: #FFD700;
                        margin-bottom: 30px;
                        font-weight: bold;
                    }
                    .thank-you {
                        font-size: 20px;
                        color: #ffffff;
                        margin-bottom: 25px;
                        line-height: 1.6;
                    }
                    .thank-you strong {
                        color: #FFD700;
                        font-weight: bold;
                    }
                    .warm-message {
                        font-size: 18px;
                        color: #ffffff;
                        margin: 30px 0;
                        line-height: 1.8;
                        font-style: italic;
                    }
                    .button-container {
                        margin: 40px 0;
                    }
                    .button {
                        display: inline-block;
                        padding: 18px 45px;
                        background: #FFD700;
                        color: #2E7D32 !important;
                        text-decoration: none;
                        border-radius: 50px;
                        font-weight: bold;
                        font-size: 18px;
                        box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    .button:hover {
                        transform: translateY(-3px);
                        box-shadow: 0 8px 25px rgba(255, 215, 0, 0.6);
                    }
                    .link-text {
                        word-break: break-all;
                        color: #FFD700;
                        font-size: 14px;
                        margin-top: 25px;
                        padding: 15px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 10px;
                        border: 1px solid rgba(255, 215, 0, 0.3);
                    }
                    .closing {
                        font-size: 19px;
                        color: #FFD700;
                        margin-top: 40px;
                        font-weight: bold;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 30px;
                        border-top: 1px solid rgba(255, 215, 0, 0.3);
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 12px;
                    }
                    @media only screen and (max-width: 600px) {
                        .email-container {
                            width: 100% !important;
                            padding: 30px 20px;
                            border-radius: 15px;
                        }
                        .greeting {
                            font-size: 20px;
                        }
                        .thank-you {
                            font-size: 18px;
                        }
                        .warm-message {
                            font-size: 16px;
                        }
                        .logo {
                            max-width: 180px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="logo-container">
                        <img src="${logoUrl}" alt="E-Advent Logo" class="logo" />
                    </div>
                    <div class="content">
                        <div class="greeting">
                            Dziękujemy za zakup kalendarza adwentowego! 🎄
                        </div>
                        <div class="thank-you">
                            Drogi <strong>${customerName}</strong>,<br><br>
                            Cieszymy się, że wybrałeś nasz kalendarz adwentowy <strong>"${calendarTitle}"</strong>!
                        </div>
                        <div class="warm-message">
                            W tym szczególnym czasie oczekiwania na Boże Narodzenie, życzymy Ci wielu radosnych chwil podczas odkrywania codziennych zadań. Niech każdy dzień przyniesie Ci uśmiech, refleksję i chwile spędzone w gronie najbliższych. 🌟
                        </div>
                        <div class="button-container">
                            <a href="${calendarLink}" class="button">Otwórz Swój Kalendarz Adwentowy</a>
                        </div>
                        <p style="text-align: center; margin-top: 20px; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                            Lub skopiuj poniższy link do przeglądarki:
                        </p>
                        <p class="link-text">${calendarLink}</p>
                        <div class="closing">
                            Wesołych Świąt Bożego Narodzenia! 🎅✨
                        </div>
                    </div>
                    <div class="footer">
                        <p>To jest automatyczna wiadomość. Prosimy nie odpowiadać na ten email.</p>
                        <p style="margin-top: 10px;">© ${new Date().getFullYear()} E-Advent</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const emailText = `
Twój Kalendarz Adwentowy!

Witaj ${customerName}!

Twój kalendarz adwentowy "${calendarTitle}" jest gotowy!

Możesz teraz rozpocząć swoją przygodę z kalendarzem adwentowym i odkrywać codzienne zadania!

Link do kalendarza: ${calendarLink}

Życzymy wspaniałej przygody z kalendarzem adwentowym! 🎅

---
To jest automatyczna wiadomość. Prosimy nie odpowiadać na ten email.
© ${new Date().getFullYear()} E-Advent
        `;

        // Wyślij email
        console.log('📧 Wysyłam email przez /api/send-email do:', email);
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
        console.error('❌ Error sending email:', error);
        res.status(500).json({ 
            error: 'Failed to send email', 
            details: error.message 
        });
    }
});

// Testowy endpoint do wysyłki przykładowego emaila
// GET /api/send-mail/test/:email lub GET /api/email/test/:email
router.get('/test/:email', async (req, res) => {
    try {
        const { email } = req.params;

        // Walidacja emaila
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Przykładowe dane
        const calendarLink = `${frontendUrl}/kalendarz/test-123`;
        const customerName = 'Testowy Użytkownik';
        const calendarTitle = 'Przykładowy Kalendarz Adwentowy';

        // Logo URL z env (config/app)
        const logoUrl = emailLogoUrl;

        // Przygotuj treść emaila z zielono-złotym motywem
        const emailSubject = `🎄 [TEST] Twój Kalendarz Adwentowy: ${calendarTitle}`;
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Georgia', 'Times New Roman', serif;
                        line-height: 1.8;
                        background: #f5f5f5;
                        padding: 40px 20px;
                    }
                    .email-container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: #2E7D32;
                        border: 4px solid #FFD700;
                        border-radius: 20px;
                        padding: 50px 40px;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                        position: relative;
                    }
                    .test-badge {
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        background: #FF5722;
                        color: white;
                        padding: 8px 15px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: bold;
                        z-index: 10;
                    }
                    .logo-container {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    .logo {
                        max-width: 250px;
                        height: auto;
                        display: block;
                        margin: 0 auto;
                    }
                    .content {
                        text-align: center;
                        color: #ffffff;
                    }
                    .greeting {
                        font-size: 24px;
                        color: #FFD700;
                        margin-bottom: 30px;
                        font-weight: bold;
                    }
                    .thank-you {
                        font-size: 20px;
                        color: #ffffff;
                        margin-bottom: 25px;
                        line-height: 1.6;
                    }
                    .thank-you strong {
                        color: #FFD700;
                        font-weight: bold;
                    }
                    .warm-message {
                        font-size: 18px;
                        color: #ffffff;
                        margin: 30px 0;
                        line-height: 1.8;
                        font-style: italic;
                    }
                    .button-container {
                        margin: 40px 0;
                    }
                    .button {
                        display: inline-block;
                        padding: 18px 45px;
                        background: #FFD700;
                        color: #2E7D32 !important;
                        text-decoration: none;
                        border-radius: 50px;
                        font-weight: bold;
                        font-size: 18px;
                        box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    .button:hover {
                        transform: translateY(-3px);
                        box-shadow: 0 8px 25px rgba(255, 215, 0, 0.6);
                    }
                    .link-text {
                        word-break: break-all;
                        color: #FFD700;
                        font-size: 14px;
                        margin-top: 25px;
                        padding: 15px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 10px;
                        border: 1px solid rgba(255, 215, 0, 0.3);
                    }
                    .closing {
                        font-size: 19px;
                        color: #FFD700;
                        margin-top: 40px;
                        font-weight: bold;
                    }
                    .test-warning {
                        margin-top: 30px;
                        padding: 15px;
                        background: rgba(255, 87, 34, 0.2);
                        border: 1px solid rgba(255, 87, 34, 0.5);
                        border-radius: 10px;
                        color: #ffffff;
                        font-size: 14px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 30px;
                        border-top: 1px solid rgba(255, 215, 0, 0.3);
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 12px;
                    }
                    @media only screen and (max-width: 600px) {
                        .email-container {
                            width: 100% !important;
                            padding: 30px 20px;
                            border-radius: 15px;
                        }
                        .greeting {
                            font-size: 20px;
                        }
                        .thank-you {
                            font-size: 18px;
                        }
                        .warm-message {
                            font-size: 16px;
                        }
                        .logo {
                            max-width: 180px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="test-badge">TEST EMAIL</div>
                    <div class="logo-container">
                        <img src="${logoUrl}" alt="E-Advent Logo" class="logo" />
                    </div>
                    <div class="content">
                        <div class="greeting">
                            Dziękujemy za zakup kalendarza adwentowego! 🎄
                        </div>
                        <div class="thank-you">
                            Drogi <strong>${customerName}</strong>,<br><br>
                            Cieszymy się, że wybrałeś nasz kalendarz adwentowy <strong>"${calendarTitle}"</strong>!
                        </div>
                        <div class="warm-message">
                            W tym szczególnym czasie oczekiwania na Boże Narodzenie, życzymy Ci wielu radosnych chwil podczas odkrywania codziennych zadań. Niech każdy dzień przyniesie Ci uśmiech, refleksję i chwile spędzone w gronie najbliższych. 🌟
                        </div>
                        <div class="button-container">
                            <a href="${calendarLink}" class="button">Otwórz Swój Kalendarz Adwentowy</a>
                        </div>
                        <p style="text-align: center; margin-top: 20px; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                            Lub skopiuj poniższy link do przeglądarki:
                        </p>
                        <p class="link-text">${calendarLink}</p>
                        <div class="closing">
                            Wesołych Świąt Bożego Narodzenia! 🎅✨
                        </div>
                        <div class="test-warning">
                            ⚠️ To jest testowy email. Link do kalendarza jest przykładowy.
                        </div>
                    </div>
                    <div class="footer">
                        <p>To jest automatyczna wiadomość. Prosimy nie odpowiadać na ten email.</p>
                        <p style="margin-top: 10px;">© ${new Date().getFullYear()} E-Advent</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const emailText = `
[TEST] Twój Kalendarz Adwentowy!

Witaj ${customerName}!

Twój kalendarz adwentowy "${calendarTitle}" jest gotowy!

Możesz teraz rozpocząć swoją przygodę z kalendarzem adwentowym i odkrywać codzienne zadania!

Link do kalendarza: ${calendarLink}

⚠️ To jest testowy email. Link do kalendarza jest przykładowy.

Życzymy wspaniałej przygody z kalendarzem adwentowym! 🎅

---
To jest automatyczna wiadomość. Prosimy nie odpowiadać na ten email.
© ${new Date().getFullYear()} E-Advent
        `;

        // Wyślij email
        console.log('📧 Wysyłam TEST email do:', email);
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
            email: email,
            calendarLink: calendarLink,
        });
    } catch (error) {
        console.error('❌ Error sending test email:', error);
        res.status(500).json({ 
            error: 'Failed to send test email', 
            details: error.message 
        });
    }
});

module.exports = router;


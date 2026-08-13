const nodemailer = require('nodemailer');

const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587');
  const secure = port === 465; // true for 465, false for other ports

  console.log('📧 Konfiguracja emaila:', {
    host,
    port,
    secure,
    user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 3)}***` : 'NOT SET',
    hasPassword: !!process.env.EMAIL_PASS,
  });

  const config = {
    host,
    port,
    secure, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      // Wyłącz weryfikację certyfikatu (tylko dla development)
      // W produkcji lepiej użyć prawidłowego certyfikatu
      rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false,
    },
    // Dodatkowe opcje dla lepszej kompatybilności
    connectionTimeout: 10000, // 10 sekund timeout
    greetingTimeout: 10000, // 10 sekund timeout na greeting
    socketTimeout: 10000, // 10 sekund timeout na socket
  };

  return nodemailer.createTransport(config);
};

const sendEmail = async (options) => {
  try {
    // Sprawdź czy wymagane zmienne środowiskowe są ustawione
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('EMAIL_USER and EMAIL_PASS must be set in environment variables');
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);

    // Lepsze komunikaty błędów dla typowych problemów
    if (error.message.includes('Invalid login') || error.message.includes('BadCredentials')) {
      const helpfulMessage = `
❌ Błąd autentykacji Gmail!

Prawdopodobne przyczyny:
1. Używasz zwykłego hasła zamiast App Password
2. App Password jest nieprawidłowy
3. Konto ma włączoną 2FA i wymaga App Password

Jak utworzyć App Password w Gmail:
1. Przejdź do: https://myaccount.google.com/apppasswords
2. Wybierz "Mail" i "Other (Custom name)"
3. Wpisz nazwę (np. "Intaz Server")
4. Skopiuj wygenerowane 16-znakowe hasło
5. Użyj tego hasła w EMAIL_PASS w pliku .env

UWAGA: Użyj App Password (16 znaków bez spacji), NIE zwykłego hasła!
      `;
      console.error(helpfulMessage);
      throw new Error('Invalid Gmail credentials. Please use App Password instead of regular password. See console for details.');
    }

    if (error.message.includes('Greeting never received') || error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      const helpfulMessage = `
❌ Błąd połączenia z serwerem SMTP!

Prawdopodobne przyczyny:
1. Nieprawidłowy EMAIL_HOST lub EMAIL_PORT w .env
2. Firewall blokuje połączenie (port ${process.env.EMAIL_PORT || '587'})
3. Problem z połączeniem internetowym
4. Serwer SMTP jest niedostępny

Sprawdź:
- EMAIL_HOST=${process.env.EMAIL_HOST || 'smtp.gmail.com'}
- EMAIL_PORT=${process.env.EMAIL_PORT || '587'}
- Czy firewall nie blokuje portu ${process.env.EMAIL_PORT || '587'}
- Czy masz połączenie z internetem

Dla Gmail użyj:
- EMAIL_HOST=smtp.gmail.com
- EMAIL_PORT=587 (lub 465 dla SSL)
      `;
      console.error(helpfulMessage);
      throw new Error(`Cannot connect to SMTP server (${process.env.EMAIL_HOST || 'smtp.gmail.com'}:${process.env.EMAIL_PORT || '587'}). Check your EMAIL_HOST and EMAIL_PORT settings. See console for details.`);
    }

    if (error.message.includes('self-signed certificate')) {
      throw new Error('SSL certificate error. Check TLS configuration.');
    }

    throw error;
  }
};

module.exports = {
  createTransporter,
  sendEmail,
};


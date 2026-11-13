const nodemailer = require('nodemailer');
const { sendEmail } = require('../../config/email');

const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv, EMAIL_USER: 'noreply@e-advent.pl', EMAIL_PASS: 'test' };
});
afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks();
});

test.each([undefined, 'noreply@e-advent.pl', 'Dawny sklep <noreply@e-advent.pl>'])(
  'names the sender in the MIME header and preserves the SMTP envelope for %s', async from => {
    if (from) process.env.EMAIL_FROM = from;
    else delete process.env.EMAIL_FROM;
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue(transport);
    const send = jest.spyOn(transport, 'sendMail');
    await sendEmail({ to: 'buyer@example.com', subject: 'Test', text: 'Test' });
    const message = await send.mock.results[0].value;
    expect(message.message.toString()).toMatch(/^From: (?:"e-Advent"|e-Advent) <noreply@e-advent\.pl>\r?$/m);
    expect(message.envelope.from).toBe('noreply@e-advent.pl');
  },
);

test.each([
  [undefined, 'https://e-advent.pl/eadvent-logo.png'],
  ['https://e-advent.pl/assets/logo.png', 'https://e-advent.pl/eadvent-logo.png'],
  ['https://example.com/custom.png', 'https://example.com/custom.png'],
])('renders the configured logo across all customer templates for %s', (configured, expected) => {
  if (configured) process.env.EMAIL_LOGO_URL = configured;
  else delete process.env.EMAIL_LOGO_URL;
  jest.isolateModules(() => {
    const { listEmailTemplates, getEmailTemplatePreview } = require('../../services/emailTemplates');
    const { buildSantaEmail } = require('../../services/santaMessages/emails');
    const templates = [
      ...listEmailTemplates().map(({ id }) => getEmailTemplatePreview(id)),
      ...['activation', 'order_received', 'audio_ready'].map(type => buildSantaEmail(type, {
        url: 'https://example.com/test', orderNumber: '000042',
      })),
    ];
    for (const { html } of templates) {
      expect(html).toContain(`<img src="${expected}" alt="e-Advent"`);
      expect(html).not.toMatch(/>\s*Kalendarz Adwentowy\s*<\/p>/i);
    }
  });
});

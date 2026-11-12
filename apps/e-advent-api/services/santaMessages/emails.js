'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { sendEmail } = require('../../config/email');
const { frontendUrl } = require('../../config/app');
const { emailShell, ctaButton, sectionLabel, escapeHtml } = require('../orderEmails');
const { santaConfig } = require('./config');

const DEV_OUTBOX = path.join(__dirname, '..', '..', 'storage', 'dev-mail');

const P = 'margin:0 0 12px 0; color:#2f3a30 !important; font-size:14px; line-height:1.6;';
const MUTED = 'margin:0 0 12px 0; color:#5a6358 !important; font-size:12px; line-height:1.55;';

function orderLabel(orderNumber) {
  return orderNumber ? ` (zamówienie ${escapeHtml(orderNumber)})` : '';
}

function linkLine(url) {
  const safe = escapeHtml(url);
  return `<p style="margin:0 0 16px 0; word-break:break-all; font-size:11px; color:#5a6358 !important;">Jeśli przycisk nie działa, skopiuj link: <a href="${safe}" style="color:#0d4a2e !important;">${safe}</a></p>`;
}

/**
 * Subjects and bodies never contain the child's data — only the order number and links.
 * @param {'activation'|'order_received'|'audio_ready'} type
 */
function buildSantaEmail(type, { url, orderNumber }) {
  if (type === 'audio_ready') {
    return {
      subject: 'Święty Mikołaj nagrał wyjątkową wiadomość!',
      html: emailShell({
        title: 'Ho, ho, ho!',
        subtitle: 'Wiadomość z Laponii jest gotowa',
        preheader: 'Nagranie od Świętego Mikołaja czeka na odsłuchanie',
        bodyHtml: `
          <p style="${P}">Święty Mikołaj właśnie skończył nagrywać wiadomość${orderLabel(orderNumber)}. Możecie ją odsłuchać razem — najlepiej w ciepłym kącie, z kubkiem kakao.</p>
          <p style="text-align:center;margin:22px 0;">${ctaButton(url, 'Odsłuchaj wiadomość')}</p>
          ${linkLine(url)}
          ${sectionLabel('Dobrze wiedzieć')}
          <p style="${MUTED}">Na stronie odsłuchu znajdziesz też przycisk do pobrania pliku MP3. Link jest prywatny — udostępniaj go tylko osobom, którym ufasz. Nagranie jest dostępne przez 12 miesięcy.</p>
          <p style="${MUTED}">To nagranie przygotowane z wykorzystaniem syntezy mowy na podstawie Twojej personalizacji, a nie rozmowa na żywo.</p>`,
      }),
      text: [
        'Święty Mikołaj nagrał wyjątkową wiadomość!',
        '',
        `Odsłuchaj: ${url}`,
        '',
        'Link jest prywatny. Na stronie możesz też pobrać plik MP3.',
      ].join('\n'),
    };
  }
  if (type === 'order_received') {
    return {
      subject: 'Dziękujemy! Przygotowujemy wyjątkową wiadomość',
      html: emailShell({
        title: 'Dziękujemy!',
        subtitle: 'Elfy przygotowują nagranie',
        preheader: 'Wiadomość od Świętego Mikołaja jest w przygotowaniu',
        bodyHtml: `
          <p style="${P}">Płatność${orderLabel(orderNumber)} została potwierdzona. Święty Mikołaj nagrywa właśnie wiadomość — gdy będzie gotowa, wyślemy link do odsłuchu na ten adres.</p>
          <p style="${MUTED}">Zwykle trwa to do 24 godzin. Jeśli wiadomość nie dotrze, sprawdź folder spam albo odpisz na tego maila.</p>`,
      }),
      text: 'Płatność została potwierdzona. Wiadomość od Świętego Mikołaja jest w przygotowaniu — link do odsłuchu wyślemy na ten adres.',
    };
  }
  return {
    subject: 'Twoja wiadomość z Laponii czeka na przygotowanie',
    html: emailShell({
      title: 'Ho, ho, ho!',
      subtitle: 'Komu Mikołaj ma nagrać wiadomość?',
      preheader: 'Uzupełnij kilka informacji, a Mikołaj nagra wiadomość',
      bodyHtml: `
        <p style="${P}">Dziękujemy za zamówienie${orderLabel(orderNumber)}! W zestawie jest osobista wiadomość głosowa od Świętego Mikołaja. Podaj imię dziecka lub imiona rodzeństwa i opowiedz, co ostatnio udało się w Waszej rodzinie — zajmie to około 3 minut.</p>
        <p style="text-align:center;margin:22px 0;">${ctaButton(url, 'Personalizuj wiadomość')}</p>
        ${linkLine(url)}
        <p style="${MUTED}">Link jest prywatny i działa tylko dla tego zamówienia.</p>`,
    }),
    text: `Uzupełnij personalizację wiadomości od Świętego Mikołaja: ${url}`,
  };
}

async function writeDevOutbox(to, mail) {
  await fs.mkdir(DEV_OUTBOX, { recursive: true });
  const file = path.join(DEV_OUTBOX, `${new Date().toISOString().replace(/[:.]/g, '-')}-${mail.type}.html`);
  await fs.writeFile(file, mail.html, 'utf8');
  console.log(`📬 [santa dev mail] ${mail.subject} → ${to}\n    ${mail.url}\n    ${file}`);
}

/** Sends through the shared mailer; locally SANTA_DEV_MAIL_OUTBOX writes HTML files instead. */
async function deliverSantaEmail({ type, to, url, orderNumber, consent }) {
  const mail = { type, url, ...buildSantaEmail(type, { url, orderNumber }) };
  if (consent?.text && consent?.acceptedAt) {
    const receipt = `Potwierdzenie zgody złożonej przy zamówieniu ${orderNumber || ''} (${consent.acceptedAt}, wersja ${consent.version}): ${consent.text}`;
    mail.html = mail.html.replace('</body>', `<p style="${MUTED}padding:20px;">${escapeHtml(receipt)}</p></body>`);
    mail.text += `\n\n${receipt}`;
  }
  if (santaConfig().devMailOutbox) {
    await writeDevOutbox(to, mail);
    return { subject: mail.subject, dev: true };
  }
  await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text });
  return { subject: mail.subject };
}

function activationUrl(token) {
  return `${frontendUrl}/wiadomosc-od-mikolaja/personalizacja/${token}`;
}

function playUrl(token) {
  return `${frontendUrl}/od-mikolaja/${token}`;
}

module.exports = { buildSantaEmail, deliverSantaEmail, activationUrl, playUrl, DEV_OUTBOX };

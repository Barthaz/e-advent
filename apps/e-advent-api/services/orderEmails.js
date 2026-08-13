const { getProduct } = require('../config/products');
const { frontendUrl, emailLogoUrl } = require('../config/app');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPln(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)} zł`;
}

function defaultLogoUrl() {
  return emailLogoUrl;
}

function emailShell({ title, subtitle, bodyHtml, logoUrl }) {
  const year = new Date().getFullYear();
  const logo = logoUrl || defaultLogoUrl();
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <style>
    body { font-family: Georgia, serif; background: #f5f5f5; color: #333; padding: 40px 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border: 3px solid #FFD700; border-radius: 15px; padding: 40px; }
    h1 { color: #2E7D32; margin: 0 0 8px; }
    h2 { color: #2E7D32; font-size: 18px; margin: 24px 0 8px; }
    .subtitle { text-align: center; color: #D4AF37; font-size: 18px; font-weight: bold; margin: 0 0 24px; }
    .order-id { font-size: 20px; font-weight: bold; letter-spacing: 1px; color: #2E7D32; word-break: break-all; }
    .btn { display: inline-block; padding: 16px 40px; background: #2E7D32; color: #fff !important; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 17px; }
    .code { font-size: 22px; font-weight: bold; letter-spacing: 3px; color: #2E7D32; }
    .items { width: 100%; border-collapse: collapse; margin: 12px 0 8px; }
    .items td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 15px; }
    .items td:last-child { text-align: right; white-space: nowrap; }
    .totals td { padding: 6px 0; font-size: 15px; }
    .totals .total-row td { font-weight: bold; font-size: 17px; color: #2E7D32; padding-top: 12px; }
    .footer { color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <img src="${escapeHtml(logo)}" alt="E-Advent" style="max-width:180px;display:block;margin:0 auto 24px;" />
    <h1 style="text-align:center;">${title}</h1>
    ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
    ${bodyHtml}
    <div class="footer">
      <p>To jest automatyczna wiadomość. Prosimy nie odpowiadać na ten email.</p>
      <p>© ${year} E-Advent</p>
    </div>
  </div>
</body>
</html>`;
}

function itemDisplayName(sku) {
  const product = getProduct(sku);
  return product?.name || sku;
}

function buildOrderConfirmationEmail({
  orderId,
  items = [],
  shipping = {},
  amount,
  shippingAmount = 0,
  hasPhysical = true,
  logoUrl,
}) {
  const safeOrderId = escapeHtml(orderId || '—');
  const rows = (items || [])
    .map((i) => {
      const name = escapeHtml(itemDisplayName(i.sku));
      const qty = Math.max(1, parseInt(i.quantity, 10) || 1);
      const unit = i.unitPrice != null ? Number(i.unitPrice) : (getProduct(i.sku)?.basePrice ?? null);
      const lineTotal = unit != null ? unit * qty : null;
      return `<tr>
        <td>${name} × ${qty}</td>
        <td>${lineTotal != null ? escapeHtml(formatPln(lineTotal)) : ''}</td>
      </tr>`;
    })
    .join('');

  const subtotal = Number(amount) - Number(shippingAmount || 0);
  const totalsHtml = `
    <table class="totals" width="100%" cellpadding="0" cellspacing="0">
      <tr><td>Produkty</td><td style="text-align:right;">${escapeHtml(formatPln(subtotal))}</td></tr>
      ${hasPhysical ? `<tr><td>Wysyłka</td><td style="text-align:right;">${Number(shippingAmount) > 0 ? escapeHtml(formatPln(shippingAmount)) : 'Gratis'}</td></tr>` : ''}
      <tr class="total-row"><td>Razem</td><td style="text-align:right;">${escapeHtml(formatPln(amount))}</td></tr>
    </table>`;

  const addressHtml = hasPhysical
    ? `<h2>Adres wysyłki</h2>
      <p style="margin:0;line-height:1.5;">
        ${escapeHtml(shipping.fullName || '')}<br>
        ${escapeHtml(shipping.street || '')}<br>
        ${escapeHtml(shipping.postalCode || '')} ${escapeHtml(shipping.city || '')}<br>
        Tel: ${escapeHtml(shipping.phone || '')}
      </p>
      <p style="margin-top:16px;">Wysyłka: <strong>Poczta Polska</strong>. Przygotujemy paczkę i wyślemy ją na podany adres. O wysyłce poinformujemy e-mailem.</p>`
    : '';

  const bodyHtml = `
    <p style="text-align:center;">Twoje zamówienie zostało przyjęte do realizacji.</p>
    <p style="text-align:center;margin:20px 0 8px;">Numer zamówienia</p>
    <p style="text-align:center;"><span class="order-id">${safeOrderId}</span></p>
    <h2>Pozycje</h2>
    <table class="items" cellpadding="0" cellspacing="0">${rows}</table>
    ${totalsHtml}
    ${addressHtml}
  `;

  return emailShell({
    title: 'Dziękujemy za zamówienie! 🎄',
    subtitle: 'Zamówienie przyjęte',
    bodyHtml,
    logoUrl,
  });
}

function buildOrderConfirmationText({
  orderId,
  items = [],
  shipping = {},
  amount,
  shippingAmount = 0,
  hasPhysical = true,
}) {
  const lines = (items || []).map((i) => {
    const name = itemDisplayName(i.sku);
    const qty = Math.max(1, parseInt(i.quantity, 10) || 1);
    return `- ${name} × ${qty}`;
  });
  const parts = [
    'Dziękujemy za zamówienie!',
    '',
    'Twoje zamówienie zostało przyjęte do realizacji.',
    `Numer zamówienia: ${orderId || '—'}`,
    '',
    'Pozycje:',
    ...lines,
    '',
    `Razem: ${formatPln(amount)}`,
  ];
  if (hasPhysical) {
    parts.push(
      `Wysyłka: ${Number(shippingAmount) > 0 ? formatPln(shippingAmount) : 'Gratis'} (Poczta Polska)`,
      '',
      'Adres wysyłki:',
      shipping.fullName || '',
      shipping.street || '',
      `${shipping.postalCode || ''} ${shipping.city || ''}`.trim(),
      `Tel: ${shipping.phone || ''}`,
      '',
      'Przygotujemy paczkę i wyślemy ją Pocztą Polską. O wysyłce poinformujemy e-mailem.',
    );
  }
  parts.push('', `© ${new Date().getFullYear()} E-Advent`);
  return parts.join('\n');
}

function buildInteractiveAccessEmail({
  calendarTitle,
  calendarLink,
  accessCode,
  logoUrl,
  subtitle = 'Zakup pomyślny!',
}) {
  const safeTitle = escapeHtml(calendarTitle || 'Twój Kalendarz Adwentowy');
  const safeLink = escapeHtml(calendarLink);
  const safeCode = escapeHtml(accessCode);
  const bodyHtml = `
    <p>Twój kalendarz adwentowy <strong>"${safeTitle}"</strong> jest gotowy!</p>
    <p style="text-align:center;margin:32px 0;">
      <a href="${safeLink}" class="btn">Otwórz Kalendarz Adwentowy</a>
    </p>
    <p>Lub skopiuj link: <a href="${safeLink}" style="color:#2E7D32;">${safeLink}</a></p>
    <p>Twój kod dostępu: <span class="code">${safeCode}</span></p>
    <p>Możesz też wejść przez <a href="${escapeHtml(`${frontendUrl}/kalendarz`)}" style="color:#2E7D32;">${escapeHtml(`${frontendUrl}/kalendarz`)}</a> podając email i kod.</p>
  `;
  return emailShell({
    title: 'Ho ho ho wesołych świąt! 🎄',
    subtitle: escapeHtml(subtitle),
    bodyHtml,
    logoUrl,
  });
}

function buildInteractiveAccessEmailText({ calendarTitle, calendarLink, accessCode }) {
  return `Twój Kalendarz Adwentowy "${calendarTitle}" jest gotowy!\n\nLink: ${calendarLink}\nKod dostępu: ${accessCode}\n\nMożesz też wejść przez ${frontendUrl}/kalendarz podając email i kod.\n\n© ${new Date().getFullYear()} E-Advent`;
}

function buildCollaborationInviteEmail({ inviterEmail, inviteeHasAccount, logoUrl }) {
  const safeInviter = escapeHtml(inviterEmail);
  const orderUrl = frontendUrl;
  const bodyHtml = inviteeHasAccount
    ? `
      <p><strong>${safeInviter}</strong> zaprasza Cię do współpracy w aplikacji e-advent.</p>
      <p>Zaloguj się w aplikacji swoim emailem i kodem dostępu do kalendarza, a następnie otwórz zakładkę <strong>Współpraca</strong>.</p>
      <p>Razem możecie dzielić się zadaniami i pomysłami na prezenty.</p>
    `
    : `
      <p><strong>${safeInviter}</strong> zaprasza Cię do współpracy w aplikacji e-advent.</p>
      <p>Aby dołączyć, potrzebujesz aktywnego kalendarza adwentowego powiązanego z tym adresem email.</p>
      <p style="text-align:center;margin:32px 0;">
        <a href="${orderUrl}" class="btn">Zamów kalendarz</a>
      </p>
      <p>Po zamówieniu zaloguj się w aplikacji i otwórz zakładkę <strong>Współpraca</strong>.</p>
    `;
  return emailShell({
    title: 'Zaproszenie do współpracy',
    subtitle: 'e-advent',
    bodyHtml,
    logoUrl,
  });
}

function buildCollaborationInviteEmailText({ inviterEmail, inviteeHasAccount }) {
  const lines = [
    `${inviterEmail} zaprasza Cię do współpracy w aplikacji e-advent.`,
    '',
  ];
  if (inviteeHasAccount) {
    lines.push(
      'Zaloguj się w aplikacji swoim emailem i kodem dostępu do kalendarza,',
      'a następnie otwórz zakładkę Współpraca.',
    );
  } else {
    lines.push(
      'Aby dołączyć, zamów kalendarz na ' + frontendUrl,
      'powiązany z tym adresem email, a potem zaloguj się w aplikacji.',
    );
  }
  lines.push('', `© ${new Date().getFullYear()} E-Advent`);
  return lines.join('\n');
}

module.exports = {
  emailShell,
  buildOrderConfirmationEmail,
  buildOrderConfirmationText,
  buildInteractiveAccessEmail,
  buildInteractiveAccessEmailText,
  buildCollaborationInviteEmail,
  buildCollaborationInviteEmailText,
};

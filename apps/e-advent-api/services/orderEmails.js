const { getProduct, getOrderItemDisplayName } = require('../config/products');
const { frontendUrl, emailLogoUrl } = require('../config/app');

const DELIVERY_LABELS = {
  poczta_polska: 'Poczta Polska',
  courier_inpost: 'Kurier InPost',
  parcel_inpost: 'Paczkomat InPost',
  none: 'Dostawa cyfrowa',
};

/** Tło szablonów — dekoracyjna ramka świąteczna (pergamin). */
const MAIL_BG_URL = 'https://e-advent.pl/assets/mail-template.png';
/** Wersja pionowa / wąska (telefony). */
const MAIL_BG_SLIM_URL = 'https://e-advent.pl/assets/mail-template-slim.png';

/**
 * Paleta odporna na dark mode (bez czystego #000 / #fff).
 * Kolory dobrane pod czytelność na beżowym pergaminie.
 */
const MAIL_COLORS = {
  ink: '#2f3a30',
  head: '#0d4a2e',
  gold: '#7a6220',
  muted: '#5a6358',
  cream: '#f4efe6',
  beige: '#f7f2ea',
  beigeOuter: '#efe6d6',
  border: '#d4c4a8',
  green: '#0d4a2e',
  greenSoft: '#e8f0ea',
};

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

function deliveryLabel(deliveryType) {
  return DELIVERY_LABELS[deliveryType] || DELIVERY_LABELS.poczta_polska;
}

function sectionLabel(text) {
  const { gold } = MAIL_COLORS;
  return `<p class="c-gold" style="margin:0 0 6px 0; font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:${gold} !important;">${escapeHtml(text)}</p>`;
}

/** Blok CSS blokujący automatyczne odwracanie kolorów w dark mode. */
function darkModeLockCss() {
  const { ink, head, gold, muted, cream, beige, beigeOuter, green } = MAIL_COLORS;
  return `
  :root { color-scheme: light only; supported-color-schemes: light; }
  body, .mail-root, .mail-root td, .mail-root p, .mail-root h1, .mail-root h2, .mail-root a, .mail-root strong, .mail-root span, .mail-root div {
    color-scheme: light only;
  }
  .c-ink { color: ${ink} !important; }
  .c-head { color: ${head} !important; }
  .c-gold { color: ${gold} !important; }
  .c-muted { color: ${muted} !important; }
  .c-cream { color: ${cream} !important; }
  .c-link { color: ${head} !important; }
  .bg-beige { background-color: ${beige} !important; }
  .btn-cta { background-color: ${green} !important; }
  .btn-cta a { color: ${cream} !important; }
  @media (prefers-color-scheme: dark) {
    body, .mail-outer { background-color: ${beigeOuter} !important; }
    .mail-bg { background-color: ${beige} !important; }
    .c-ink, .mail-root .c-ink { color: ${ink} !important; }
    .c-head, .mail-root .c-head, .mail-root h1, .mail-root h2 { color: ${head} !important; }
    .c-gold, .mail-root .c-gold { color: ${gold} !important; }
    .c-muted, .mail-root .c-muted { color: ${muted} !important; }
    .c-cream, .mail-root .c-cream, .btn-cta a { color: ${cream} !important; }
    .c-link, .mail-root a.c-link, .mail-root a { color: ${head} !important; }
    .btn-cta, .day-badge { background-color: ${green} !important; }
    .mail-root h1, .mail-root h2 { color: ${head} !important; }
    .mail-root .c-ink { color: ${ink} !important; }
    .mail-root .c-gold { color: ${gold} !important; }
    .mail-root .c-muted { color: ${muted} !important; }
    .mail-root .c-cream { color: ${cream} !important; }
    .mail-root .btn-cta a { color: ${cream} !important; }
  }
  [data-ogsc] .c-ink, [data-ogsb] .c-ink { color: ${ink} !important; }
  [data-ogsc] .c-head, [data-ogsb] .c-head { color: ${head} !important; }
  [data-ogsc] .c-gold, [data-ogsb] .c-gold { color: ${gold} !important; }
  [data-ogsc] .c-muted, [data-ogsb] .c-muted { color: ${muted} !important; }
  [data-ogsc] .c-cream, [data-ogsb] .c-cream { color: ${cream} !important; }
  [data-ogsc] .c-link, [data-ogsb] .c-link { color: ${head} !important; }
  [data-ogsc] .btn-cta, [data-ogsb] .btn-cta { background-color: ${green} !important; }
  [data-ogsc] .btn-cta a, [data-ogsb] .btn-cta a { color: ${cream} !important; }
`;
}

/**
 * Wspólna ramka wszystkich maili e-Advent.
 * Pergaminowe tło + ciemna zieleń / złoto; table-based HTML (Outlook).
 */
function emailShell({ title, subtitle, bodyHtml, logoUrl, preheader, footerNote }) {
  const year = new Date().getFullYear();
  const logo = logoUrl || defaultLogoUrl();
  const safeTitle = escapeHtml(title || 'e-Advent');
  const safeSubtitle = subtitle ? escapeHtml(subtitle) : '';
  const safePreheader = escapeHtml(preheader || title || 'Wiadomość od e-Advent');
  const safeFooter = escapeHtml(
    footerNote || 'To jest automatyczna wiadomość od e-Advent. W razie pytań napisz na kontakt@e-advent.pl.'
  );
  const logoBlock = logo
    ? `<img src="${escapeHtml(logo)}" alt="e-Advent" width="140" style="max-width:140px;height:auto;display:block;margin:0 auto 12px;border:0;" />`
    : '';
  const { ink, head, gold, muted, beige, beigeOuter } = MAIL_COLORS;
  const bg = MAIL_BG_URL;
  const bgSlim = MAIL_BG_SLIM_URL;

  return `<!DOCTYPE html>
<html lang="pl" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${safeTitle}</title>
<!--[if mso]>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
<![endif]-->
<style>
  body, table, td { font-family: Georgia, 'Times New Roman', serif; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; background-color:${beigeOuter} !important; }
  table { border-collapse:collapse; }
  img { border:0; line-height:100%; outline:none; text-decoration:none; }
  a { text-decoration:none; }
  ${darkModeLockCss()}
  @media only screen and (max-width: 600px) {
    .container { width:100% !important; }
    .mail-bg {
      background-image:url('${escapeHtml(bgSlim)}') !important;
      background-size:100% 100% !important;
      background-position:center top !important;
      background-repeat:no-repeat !important;
    }
    .px-mobile { padding-left:28px !important; padding-right:28px !important; }
    .day-number { font-size:44px !important; }
    .task-title { font-size:18px !important; }
  }
</style>
</head>
<body class="mail-outer" style="margin:0; padding:0; background-color:${beigeOuter} !important;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
  ${safePreheader}
</div>
<!-- Prefetch slim bg for clients that strip unused CSS urls -->
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;" aria-hidden="true">
  <img src="${escapeHtml(bgSlim)}" width="1" height="1" alt="" />
</div>
<table role="presentation" class="mail-outer" width="100%" cellpadding="0" cellspacing="0" style="background-color:${beigeOuter} !important; padding:28px 0;">
  <tr>
    <td align="center" style="padding:0 12px;">
      <!--[if gte mso 9]>
      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
      <v:fill type="frame" src="${bg}" color="${beige}" />
      <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
      <![endif]-->
      <table role="presentation" class="container mail-bg mail-root" width="600" cellpadding="0" cellspacing="0"
        background="${escapeHtml(bg)}"
        style="width:600px; max-width:600px; background-color:${beige} !important; background-image:url('${escapeHtml(bg)}'); background-repeat:no-repeat; background-position:center top; background-size:100% 100%;">
        <tr>
          <td style="background-color:rgba(255,255,255,0.35);">
            <!--[if gte mso 9]>
            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="position:absolute; top:0; left:0; width:600px; height:100%;">
            <v:fill type="solid" color="#ffffff" opacity="35%" />
            <v:textbox inset="0,0,0,0">
            <![endif]-->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" class="px-mobile" style="padding:48px 52px 8px 52px;">
                  ${logoBlock}
                  <p class="c-gold" style="margin:0; letter-spacing:4px; text-transform:uppercase; font-size:10px; color:${gold} !important; font-family:'Helvetica Neue',Arial,sans-serif;">
                    Kalendarz Adwentowy
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" class="px-mobile" style="padding:10px 52px 6px 52px;">
                  <h1 class="c-head" style="margin:0; font-family:Georgia,'Times New Roman',serif; font-size:22px; line-height:1.35; color:${head} !important; font-weight:normal;">
                    ${safeTitle}
                  </h1>
                  ${safeSubtitle ? `<p class="c-gold" style="margin:8px 0 0 0; font-family:'Helvetica Neue',Arial,sans-serif; font-size:13px; color:${gold} !important; letter-spacing:0.3px;">${safeSubtitle}</p>` : ''}
                </td>
              </tr>
              <tr>
                <td class="px-mobile" style="padding:8px 52px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="border-top:1px solid ${MAIL_COLORS.border}; font-size:0; line-height:0;">&nbsp;</td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td class="px-mobile c-ink" style="padding:18px 52px 12px 52px; font-family:Georgia,'Times New Roman',serif; font-size:14px; line-height:1.65; color:${ink} !important;">
                  ${bodyHtml}
                </td>
              </tr>
              <tr>
                <td class="px-mobile" style="padding:8px 52px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="border-top:1px solid ${MAIL_COLORS.border}; font-size:0; line-height:0;">&nbsp;</td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td align="center" class="px-mobile" style="padding:16px 52px 52px 52px;">
                  <p class="c-muted" style="margin:0 0 6px 0; font-family:'Helvetica Neue',Arial,sans-serif; font-size:11px; line-height:1.5; color:${muted} !important;">
                    ${safeFooter}
                  </p>
                  <p class="c-gold" style="margin:0; font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; color:${gold} !important;">
                    © ${year} e-Advent · <a class="c-link" href="${escapeHtml(frontendUrl)}" style="color:${head} !important;">e-advent.pl</a>
                  </p>
                </td>
              </tr>
            </table>
            <!--[if gte mso 9]>
            </v:textbox>
            </v:rect>
            <![endif]-->
          </td>
        </tr>
      </table>
      <!--[if gte mso 9]>
      </v:textbox>
      </v:rect>
      <![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

function ctaButton(href, label) {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  const { green, cream } = MAIL_COLORS;
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center">
              <tr>
                <td align="center" class="btn-cta" bgcolor="${green}" style="border-radius:24px; background-color:${green} !important;">
                  <a class="c-cream" href="${safeHref}" style="display:inline-block; padding:11px 28px; font-family:'Helvetica Neue',Arial,sans-serif; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:${cream} !important; font-weight:bold;">
                    ${safeLabel}
                  </a>
                </td>
              </tr>
            </table>`;
}

function itemDisplayName(sku, metadata) {
  return getOrderItemDisplayName(sku, metadata);
}

function itemsTableHtml(items) {
  const { ink, border } = MAIL_COLORS;
  const rows = (items || [])
    .map((i) => {
      const name = escapeHtml(itemDisplayName(i.sku, i.metadata));
      const qty = Math.max(1, parseInt(i.quantity, 10) || 1);
      const unit = i.unitPrice != null ? Number(i.unitPrice) : (getProduct(i.sku)?.basePrice ?? null);
      const lineTotal = unit != null ? unit * qty : null;
      return `<tr>
        <td class="c-ink" style="padding:7px 0; border-bottom:1px solid ${border}; color:${ink} !important; font-size:13px;">${name} × ${qty}</td>
        <td class="c-ink" style="padding:7px 0; border-bottom:1px solid ${border}; color:${ink} !important; font-size:13px; text-align:right; white-space:nowrap;">${lineTotal != null ? escapeHtml(formatPln(lineTotal)) : ''}</td>
      </tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function buildOrderConfirmationEmail({
  orderId,
  items = [],
  shipping = {},
  parcelLocker = null,
  deliveryType,
  amount,
  shippingAmount = 0,
  hasPhysical = true,
  logoUrl,
}) {
  const safeOrderId = escapeHtml(orderId || '—');
  const subtotal = Number(amount) - Number(shippingAmount || 0);
  const carrier = deliveryLabel(deliveryType);
  const totalsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:5px 0; color:#5a6358 !important; font-size:13px;">Produkty</td><td style="text-align:right; color:#5a6358 !important; font-size:13px;">${escapeHtml(formatPln(subtotal))}</td></tr>
      ${hasPhysical ? `<tr><td style="padding:5px 0; color:#5a6358 !important; font-size:13px;">Wysyłka</td><td style="text-align:right; color:#5a6358 !important; font-size:13px;">${Number(shippingAmount) > 0 ? escapeHtml(formatPln(shippingAmount)) : 'Gratis'}</td></tr>` : ''}
      <tr><td style="padding:10px 0 0 0; font-weight:bold; font-size:15px; color:#0d4a2e !important;">Razem</td><td style="padding:10px 0 0 0; text-align:right; font-weight:bold; font-size:15px; color:#0d4a2e !important;">${escapeHtml(formatPln(amount))}</td></tr>
    </table>`;

  let addressHtml = '';
  if (hasPhysical) {
    if (deliveryType === 'parcel_inpost' && parcelLocker) {
      addressHtml = `${sectionLabel('Paczkomat InPost')}
      <p style="margin:0;line-height:1.55;color:#2f3a30 !important;font-size:13px;">
        ${escapeHtml(parcelLocker.name || parcelLocker.id || '')}<br>
        ${escapeHtml(parcelLocker.address || '')}
      </p>
      <p style="margin-top:14px;color:#5a6358 !important;font-size:13px;">Przygotujemy paczkę i wyślemy ją do wskazanego paczkomatu. Gdy przesyłka wyruszy w drogę, dostaniesz osobny e-mail z numerem listu przewozowego.</p>`;
    } else {
      addressHtml = `${sectionLabel('Adres wysyłki')}
      <p style="margin:0;line-height:1.55;color:#2f3a30 !important;font-size:13px;">
        ${escapeHtml(shipping.fullName || '')}<br>
        ${escapeHtml(shipping.street || '')}<br>
        ${escapeHtml(shipping.postalCode || '')} ${escapeHtml(shipping.city || '')}<br>
        Tel: ${escapeHtml(shipping.phone || '')}
      </p>
      <p style="margin-top:14px;color:#5a6358 !important;font-size:13px;">Wysyłka: <strong style="color:#0d4a2e !important;">${escapeHtml(carrier)}</strong>. Po spakowaniu zamówienia wyślemy Ci numer listu przewozowego.</p>`;
    }
  }

  const bodyHtml = `
    <p style="margin:0 0 14px 0; text-align:center; color:#2f3a30 !important; font-size:14px;">Dziękujemy za zaufanie. Twoje zamówienie zostało przyjęte i trafiło do realizacji.</p>
    <p style="margin:0 0 18px 0; text-align:center; color:#5a6358 !important; font-size:12px; line-height:1.55;">Zachowaj ten e-mail — numer zamówienia przyda się przy kontakcie z obsługą.</p>
    ${sectionLabel('Numer zamówienia')}
    <p style="margin:0 0 20px 0; text-align:center; font-size:16px; font-weight:bold; letter-spacing:1px; color:#0d4a2e !important; font-family:'Helvetica Neue',Arial,sans-serif;">${safeOrderId}</p>
    ${sectionLabel('Pozycje')}
    ${itemsTableHtml(items)}
    <div style="margin-top:10px;">${totalsHtml}</div>
    <div style="margin-top:18px;">${addressHtml}</div>
  `;

  return emailShell({
    title: 'Dziękujemy za zamówienie!',
    subtitle: 'Potwierdzenie przyjęcia do realizacji',
    preheader: `Potwierdzenie zamówienia ${orderId || ''}`.trim(),
    bodyHtml,
    logoUrl,
  });
}

function buildOrderConfirmationText({
  orderId,
  items = [],
  shipping = {},
  parcelLocker = null,
  deliveryType,
  amount,
  shippingAmount = 0,
  hasPhysical = true,
}) {
  const lines = (items || []).map((i) => {
    const name = itemDisplayName(i.sku, i.metadata);
    const qty = Math.max(1, parseInt(i.quantity, 10) || 1);
    return `- ${name} × ${qty}`;
  });
  const parts = [
    'Dziękujemy za zamówienie!',
    '',
    'Twoje zamówienie zostało przyjęte i trafiło do realizacji.',
    `Numer zamówienia: ${orderId || '—'}`,
    '',
    'Pozycje:',
    ...lines,
    '',
    `Razem: ${formatPln(amount)}`,
  ];
  if (hasPhysical) {
    if (deliveryType === 'parcel_inpost' && parcelLocker) {
      parts.push(
        '',
        'Paczkomat InPost:',
        parcelLocker.name || parcelLocker.id || '',
        parcelLocker.address || '',
        '',
        'O wysyłce poinformujemy e-mailem z numerem listu.',
      );
    } else {
      parts.push(
        `Wysyłka: ${Number(shippingAmount) > 0 ? formatPln(shippingAmount) : 'Gratis'} (${deliveryLabel(deliveryType)})`,
        '',
        'Adres wysyłki:',
        shipping.fullName || '',
        shipping.street || '',
        `${shipping.postalCode || ''} ${shipping.city || ''}`.trim(),
        `Tel: ${shipping.phone || ''}`,
        '',
        'Po spakowaniu wyślemy numer listu przewozowego.',
      );
    }
  }
  parts.push('', `© ${new Date().getFullYear()} e-Advent`);
  return parts.join('\n');
}

function buildInteractiveAccessEmail({
  calendarTitle,
  calendarLink,
  accessCode,
  logoUrl,
  subtitle = 'Twój kalendarz jest gotowy',
}) {
  const safeTitle = escapeHtml(calendarTitle || 'Twój Kalendarz Adwentowy');
  const safeLink = escapeHtml(calendarLink);
  const safeCode = escapeHtml(accessCode);
  const loginUrl = `${frontendUrl}/kalendarz`;
  const bodyHtml = `
    <p style="margin:0 0 12px 0; color:#2f3a30 !important; font-size:14px;">Płatność przebiegła pomyślnie. Kalendarz <strong style="color:#0d4a2e !important;">„${safeTitle}”</strong> jest już aktywny i czeka na pierwsze okienko.</p>
    <p style="margin:0 0 18px 0; color:#5a6358 !important; font-size:12px; line-height:1.55;">Otwórz go od razu przyciskiem poniżej albo zachowaj kod dostępu — przyda się przy logowaniu z innego urządzenia.</p>
    <p style="text-align:center;margin:22px 0;">${ctaButton(calendarLink, 'Otwórz kalendarz')}</p>
    <p style="margin:0 0 16px 0; word-break:break-all; font-size:11px; color:#5a6358 !important;">Link: <a href="${safeLink}" style="color:#0d4a2e !important;">${safeLink}</a></p>
    ${sectionLabel('Kod dostępu')}
    <p style="margin:0 0 16px 0; text-align:center; font-size:22px; font-weight:bold; letter-spacing:5px; color:#0d4a2e !important; font-family:'Helvetica Neue',Arial,sans-serif;">${safeCode}</p>
    <p style="margin:0; color:#5a6358 !important; font-size:12px; line-height:1.55;">Możesz też wejść przez <a href="${escapeHtml(loginUrl)}" style="color:#0d4a2e !important;">${escapeHtml(loginUrl)}</a>, podając adres e-mail i kod dostępu.</p>
  `;
  return emailShell({
    title: 'Ho ho ho — wesołych świąt!',
    subtitle,
    preheader: `Twój kalendarz „${calendarTitle || 'e-Advent'}” jest gotowy`,
    bodyHtml,
    logoUrl,
  });
}

function buildInteractiveAccessEmailText({ calendarTitle, calendarLink, accessCode }) {
  return [
    `Twój Kalendarz Adwentowy "${calendarTitle}" jest gotowy!`,
    '',
    'Płatność przebiegła pomyślnie — kalendarz jest aktywny.',
    '',
    `Link: ${calendarLink}`,
    `Kod dostępu: ${accessCode}`,
    '',
    `Możesz też wejść przez ${frontendUrl}/kalendarz podając email i kod.`,
    '',
    `© ${new Date().getFullYear()} e-Advent`,
  ].join('\n');
}

function buildCollaborationInviteEmail({ inviterEmail, inviteeHasAccount, logoUrl }) {
  const safeInviter = escapeHtml(inviterEmail);
  const orderUrl = frontendUrl;
  const bodyHtml = inviteeHasAccount
    ? `
      <p style="margin:0 0 12px 0; font-size:14px;"><strong style="color:#0d4a2e !important;">${safeInviter}</strong> zaprasza Cię do wspólnego korzystania z aplikacji e-Advent.</p>
      <p style="margin:0 0 12px 0; color:#5a6358 !important; font-size:13px; line-height:1.55;">Zaloguj się w aplikacji swoim e-mailem i kodem dostępu do kalendarza, a następnie otwórz zakładkę <strong style="color:#0d4a2e !important;">Współpraca</strong>.</p>
      <p style="margin:0; color:#5a6358 !important; font-size:13px; line-height:1.55;">Razem możecie dzielić się zadaniami z okienek i pomysłami na prezenty — wygodniej i bliżej świątecznej atmosfery.</p>
    `
    : `
      <p style="margin:0 0 12px 0; font-size:14px;"><strong style="color:#0d4a2e !important;">${safeInviter}</strong> zaprasza Cię do współpracy w aplikacji e-Advent.</p>
      <p style="margin:0 0 18px 0; color:#5a6358 !important; font-size:13px; line-height:1.55;">Aby dołączyć, potrzebujesz aktywnego kalendarza adwentowego powiązanego z tym adresem e-mail.</p>
      <p style="text-align:center;margin:22px 0;">${ctaButton(orderUrl, 'Zamów kalendarz')}</p>
      <p style="margin:0; color:#5a6358 !important; font-size:13px; line-height:1.55;">Po zamówieniu zaloguj się w aplikacji i otwórz zakładkę <strong style="color:#0d4a2e !important;">Współpraca</strong>.</p>
    `;
  return emailShell({
    title: 'Zaproszenie do współpracy',
    subtitle: 'Wspólny adwent w e-Advent',
    preheader: `${inviterEmail} zaprasza Cię do współpracy w e-advent`,
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
  lines.push('', `© ${new Date().getFullYear()} e-Advent`);
  return lines.join('\n');
}

function polishDayDate(day, year) {
  return `${day} grudnia ${year}`;
}

function getTaskText(task) {
  if (!task || typeof task !== 'object') return '';
  return String(task.task ?? task.title ?? task.content ?? '').trim();
}

function buildDailyWindowEmail({
  day,
  year,
  taskTitle,
  taskBody,
  calendarTitle,
  progressPercent,
  calendarLink,
  logoUrl,
  isSpecial = false,
}) {
  const n = Number(day) || 1;
  const y = year || new Date().getFullYear();
  const heading = taskTitle || `Dzień ${n} — ${calendarTitle || 'Kalendarz adwentowy'}`;
  const safeHeading = escapeHtml(heading);
  const safeBody = escapeHtml(taskBody || '').replace(/\n/g, '<br>');
  const pct = Math.max(0, Math.min(100, Number(progressPercent) || Math.round((n / 24) * 100)));
  const ctaLabel = isSpecial ? 'Otwórz dodatek' : 'Zobacz online';
  const intro = isSpecial
    ? 'Kolejny dzień adwentu. Treść okienka jest w tym mailu — interaktywny dodatek otworzysz od razu w kalendarzu, bez ponownego czytania zadania.'
    : 'Kolejny dzień adwentu — otwórz okienko i ciesz się wspólną chwilą. Treść maila to zadanie dnia; ewentualny dodatek premium odkryjesz dopiero po otwarciu okienka w kalendarzu.';
  const cta = calendarLink
    ? `<tr>
          <td align="center" style="padding:18px 0 6px 0;">
            ${ctaButton(calendarLink, ctaLabel)}
          </td>
        </tr>`
    : '';

  const unique = `
    <p style="margin:0 0 16px 0; text-align:center; color:#5a6358 !important; font-size:12px; line-height:1.55;">${escapeHtml(intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:0 0 8px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" class="day-badge" bgcolor="#0d4a2e" style="width:112px; height:112px; border-radius:50%; background-color:#0d4a2e !important;">
                <table role="presentation" width="100%" height="112" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" valign="middle" style="height:112px;">
                      <div class="c-cream" style="font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; letter-spacing:2.5px; color:#f4efe6 !important; text-transform:uppercase;">Dzień</div>
                      <div class="day-number c-cream" style="font-family:Georgia,'Times New Roman',serif; font-size:48px; line-height:1; color:#f4efe6 !important; font-weight:bold;">${n}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:4px 0 18px 0;">
          <p style="margin:0; font-family:'Helvetica Neue',Arial,sans-serif; font-size:12px; color:#5a6358 !important; letter-spacing:0.5px;">
            ${escapeHtml(polishDayDate(n, y))}
          </p>
        </td>
      </tr>
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.55); border-radius:10px; border:1px solid #e4d9c4;">
            <tr>
              <td align="center" style="padding:22px 20px 8px 20px;">
                <p style="margin:0; font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:#7a6220 !important;">
                  Dzisiejsze okienko
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:6px 20px 4px 20px;">
                <h2 class="task-title" style="margin:0; font-family:Georgia,'Times New Roman',serif; font-size:18px; line-height:1.35; color:#0d4a2e !important; font-weight:normal;">
                  ${safeHeading}
                </h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 20px 22px 20px;">
                <p style="margin:0; font-family:Georgia,'Times New Roman',serif; font-size:14px; line-height:1.65; color:#2f3a30 !important;">
                  ${safeBody}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${cta}
      <tr>
        <td style="padding:20px 0 0 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color:#e4d9c4; border-radius:6px; height:6px; font-size:0; line-height:0;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:${pct}%;">
                  <tr><td style="background-color:#0d4a2e !important; height:6px; border-radius:6px; font-size:0; line-height:0;">&nbsp;</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:8px;">
                <p style="margin:0; font-family:'Helvetica Neue',Arial,sans-serif; font-size:11px; color:#5a6358 !important; letter-spacing:0.5px;">
                  Otwarto ${n} z 24 okienek
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return emailShell({
    title: `Dzień ${n}`,
    subtitle: calendarTitle || 'Kalendarz adwentowy',
    preheader: `Dzień ${n} kalendarza adwentowego — dzisiejsze okienko już otwarte`,
    footerNote: 'Do zobaczenia jutro przy kolejnym okienku. Miłego adwentu!',
    bodyHtml: unique,
    logoUrl,
  });
}

function buildDailyWindowEmailText({ day, year, taskTitle, taskBody, calendarTitle, calendarLink, isSpecial = false }) {
  const n = Number(day) || 1;
  const y = year || new Date().getFullYear();
  const lines = [
    `Dzień ${n} — ${calendarTitle || 'Kalendarz adwentowy'}`,
    polishDayDate(n, y),
    '',
    taskTitle || `Dzień ${n}`,
    taskBody || '',
  ];
  if (isSpecial) {
    lines.push('', 'To okienko ma interaktywny dodatek — otwórz go w kalendarzu.');
  }
  if (calendarLink) {
    lines.push('', `${isSpecial ? 'Otwórz dodatek' : 'Zobacz online'}: ${calendarLink}`);
  }
  lines.push('', `Otwarto ${n} z 24 okienek`, '', `© ${new Date().getFullYear()} e-Advent`);
  return lines.join('\n');
}

function buildShippingEmail({
  orderId,
  items = [],
  trackingNumber,
  deliveryType,
  shipping = {},
  parcelLocker = null,
  logoUrl,
}) {
  const carrier = deliveryLabel(deliveryType);
  const safeTracking = escapeHtml(trackingNumber || '—');
  let destinationHtml = '';
  if (deliveryType === 'parcel_inpost' && parcelLocker) {
    destinationHtml = `${sectionLabel('Paczkomat')}
      <p style="margin:0;line-height:1.55;color:#2f3a30 !important;font-size:13px;">
        ${escapeHtml(parcelLocker.name || parcelLocker.id || '')}<br>
        ${escapeHtml(parcelLocker.address || '')}
      </p>`;
  } else {
    destinationHtml = `${sectionLabel('Adres dostawy')}
      <p style="margin:0;line-height:1.55;color:#2f3a30 !important;font-size:13px;">
        ${escapeHtml(shipping.fullName || '')}<br>
        ${escapeHtml(shipping.street || '')}<br>
        ${escapeHtml(shipping.postalCode || '')} ${escapeHtml(shipping.city || '')}
      </p>`;
  }

  const bodyHtml = `
    <p style="margin:0 0 12px 0; text-align:center; font-size:14px; color:#2f3a30 !important;">Twoja paczka e-Advent została przekazana do wysyłki.</p>
    <p style="margin:0 0 18px 0; text-align:center; color:#5a6358 !important; font-size:12px; line-height:1.55;">Poniżej znajdziesz numer listu przewozowego — możesz śledzić przesyłkę u przewoźnika.</p>
    ${sectionLabel('Numer listu')}
    <p style="margin:0 0 6px 0; text-align:center; font-size:18px; font-weight:bold; letter-spacing:1.5px; color:#0d4a2e !important; word-break:break-all; font-family:'Helvetica Neue',Arial,sans-serif;">${safeTracking}</p>
    <p style="margin:0 0 18px 0; text-align:center; color:#5a6358 !important; font-size:13px;">Przewoźnik: <strong style="color:#0d4a2e !important;">${escapeHtml(carrier)}</strong></p>
    ${sectionLabel('Zamówienie')}
    <p style="margin:0 0 18px 0; text-align:center; color:#2f3a30 !important; font-size:14px; font-family:'Helvetica Neue',Arial,sans-serif;">${escapeHtml(orderId || '—')}</p>
    ${sectionLabel('Zawartość')}
    ${itemsTableHtml(items)}
    <div style="margin-top:16px;">${destinationHtml}</div>
  `;

  return emailShell({
    title: 'Paczka została wysłana',
    subtitle: carrier,
    preheader: `Twoja paczka e-Advent została wysłana. Numer listu: ${trackingNumber || ''}`,
    bodyHtml,
    logoUrl,
  });
}

function buildShippingEmailText({
  orderId,
  items = [],
  trackingNumber,
  deliveryType,
  shipping = {},
  parcelLocker = null,
}) {
  const lines = [
    'Twoja paczka e-Advent została wysłana.',
    '',
    `Numer listu: ${trackingNumber || '—'}`,
    `Przewoźnik: ${deliveryLabel(deliveryType)}`,
    `Zamówienie: ${orderId || '—'}`,
    '',
    'Zawartość:',
    ...(items || []).map((i) => `- ${itemDisplayName(i.sku, i.metadata)} × ${Math.max(1, parseInt(i.quantity, 10) || 1)}`),
    '',
  ];
  if (deliveryType === 'parcel_inpost' && parcelLocker) {
    lines.push('Paczkomat:', parcelLocker.name || parcelLocker.id || '', parcelLocker.address || '');
  } else {
    lines.push(
      'Adres dostawy:',
      shipping.fullName || '',
      shipping.street || '',
      `${shipping.postalCode || ''} ${shipping.city || ''}`.trim(),
    );
  }
  lines.push('', `© ${new Date().getFullYear()} e-Advent`);
  return lines.join('\n');
}

function dailyWindowSubject(day, calendarTitle) {
  return `Dzień ${day} kalendarza adwentowego — ${calendarTitle || 'e-Advent'}`;
}

module.exports = {
  escapeHtml,
  emailShell,
  getTaskText,
  deliveryLabel,
  dailyWindowSubject,
  MAIL_BG_URL,
  MAIL_BG_SLIM_URL,
  MAIL_COLORS,
  buildOrderConfirmationEmail,
  buildOrderConfirmationText,
  buildInteractiveAccessEmail,
  buildInteractiveAccessEmailText,
  buildCollaborationInviteEmail,
  buildCollaborationInviteEmailText,
  buildDailyWindowEmail,
  buildDailyWindowEmailText,
  buildShippingEmail,
  buildShippingEmailText,
};

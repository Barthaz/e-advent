/**
 * Katalog szablonów e-mail + render podglądu z mockowanymi danymi (panel admin).
 */
const { frontendUrl } = require('../config/app');
const {
  buildOrderConfirmationEmail,
  buildOrderConfirmationText,
  buildInteractiveAccessEmail,
  buildInteractiveAccessEmailText,
  buildShippingEmail,
  buildShippingEmailText,
  buildShipmentPreparedEmail,
  buildShipmentPreparedEmailText,
  buildDailyWindowEmail,
  buildDailyWindowEmailText,
  buildCollaborationInviteEmail,
  buildCollaborationInviteEmailText,
  dailyWindowSubject,
} = require('./orderEmails');

const TEMPLATES = [
  {
    id: 'order_confirmation',
    name: 'Potwierdzenie zamówienia',
    description: 'Po opłaceniu zamówienia z produktami fizycznymi (zdrapka, list, certyfikat).',
    trigger: 'Webhook Stripe / ręczne wysłanie z karty zamówienia',
    subject: '🎄 Potwierdzenie zamówienia e-Advent',
  },
  {
    id: 'interactive_access',
    name: 'Dostęp do kalendarza',
    description: 'Link i kod dostępu do kalendarza interaktywnego po płatności.',
    trigger: 'Webhook Stripe / aktywacja darmowa / ręczne wysłanie',
    subject: '🎄 Twój Kalendarz Adwentowy: {tytuł}',
  },
  {
    id: 'shipment_prepared',
    name: 'Paczka przygotowana',
    description: 'Numer przesyłki InPost i link do śledzenia, gdy etykieta jest gotowa. Wysyłany raz na zamówienie.',
    trigger: 'Panel — przycisk „Generuj etykietę” (pobranie PDF ponawia mail tylko, gdy wcześniej się nie udał)',
    subject: 'Twoja paczka e-Advent jest przygotowana do wysyłki',
  },
  {
    id: 'shipping',
    name: 'Wysłanie paczki',
    description: 'Informacja o nadaniu przesyłki z numerem listu przewozowego.',
    trigger: 'Panel — „Oznacz jako wysłane” (InPost) albo „Wyślij mail o wysyłce” (inne dostawy, wymaga numeru listu)',
    subject: 'Twoja paczka e-Advent została wysłana',
  },
  {
    id: 'daily_window',
    name: 'Codzienne okienko',
    description: 'Treść dnia dla kalendarzy z metodą otwierania „codzienny e-mail”.',
    trigger: 'Cron o 8:00 czasu polskiego (1–24 grudnia) — tylko metoda „codzienny e-mail” i nieotwarte okienko; panel może wysłać ręcznie',
    subject: 'Dzień {n} kalendarza adwentowego — {tytuł}',
  },
  {
    id: 'collaboration_invite',
    name: 'Zaproszenie do współpracy',
    description: 'Zaproszenie drugiej osoby do współpracy w aplikacji mobilnej.',
    trigger: 'Aplikacja mobilna — zakładka Współpraca',
    subject: 'Zaproszenie do współpracy w e-Advent',
  },
];

function mockOrderConfirmation() {
  const payload = {
    orderId: '000042',
    items: [
      { sku: 'scratch-a4', quantity: 1, unitPrice: 49 },
      { sku: 'santa-certificate', quantity: 1, unitPrice: 19, metadata: { childName: 'Zosia' } },
    ],
    shipping: {
      fullName: 'Anna Kowalska',
      street: 'ul. Świętego Mikołaja 12/3',
      city: 'Warszawa',
      postalCode: '00-001',
      phone: '500 600 700',
    },
    deliveryType: 'poczta_polska',
    amount: 73,
    shippingAmount: 5,
    hasPhysical: true,
  };
  return {
    subject: '🎄 Potwierdzenie zamówienia e-Advent',
    html: buildOrderConfirmationEmail(payload),
    text: buildOrderConfirmationText(payload),
  };
}

function mockInteractiveAccess() {
  const calendarTitle = 'Adwent u Kowalskich';
  const calendarLink = `${frontendUrl}/kalendarz/mock-calendar-id`;
  const accessCode = 'ADVENT';
  return {
    subject: `🎄 Twój Kalendarz Adwentowy: ${calendarTitle}`,
    html: buildInteractiveAccessEmail({
      calendarTitle,
      calendarLink,
      accessCode,
      subtitle: 'Twój kalendarz jest gotowy',
    }),
    text: buildInteractiveAccessEmailText({ calendarTitle, calendarLink, accessCode }),
  };
}

function mockShipping() {
  const payload = {
    orderId: '000042',
    items: [
      { sku: 'scratch-a4', quantity: 1, unitPrice: 49 },
      { sku: 'santa-letter', quantity: 1, unitPrice: 29 },
    ],
    trackingNumber: 'PX123456789PL',
    deliveryType: 'courier_inpost',
    shipping: {
      fullName: 'Anna Kowalska',
      street: 'ul. Świętego Mikołaja 12/3',
      city: 'Warszawa',
      postalCode: '00-001',
    },
  };
  return {
    subject: 'Twoja paczka e-Advent została wysłana',
    html: buildShippingEmail(payload),
    text: buildShippingEmailText(payload),
  };
}

function mockShipmentPrepared() {
  const payload = {
    orderId: '000042',
    items: [
      { sku: 'scratch-a4', quantity: 1, unitPrice: 49 },
      { sku: 'santa-letter', quantity: 1, unitPrice: 29 },
    ],
    trackingNumber: '520000012345678901234567',
    deliveryType: 'parcel_inpost',
    parcelLocker: { id: 'KRA01M', name: 'Paczkomat KRA01M', address: 'ul. Testowa 1, 30-001 Kraków' },
  };
  return {
    subject: 'Twoja paczka e-Advent jest przygotowana do wysyłki',
    html: buildShipmentPreparedEmail(payload),
    text: buildShipmentPreparedEmailText(payload),
  };
}

function mockDailyWindow() {
  const day = 3;
  const year = 2026;
  const calendarTitle = 'Adwent u Kowalskich';
  const taskTitle = `Dzień ${day} — Wspólne pieczenie pierników`;
  const taskBody = 'Dziś upieczcie razem pierniki. Niech każdy udekoruje jednego — a potem wspólnie wypijcie kakao.';
  const calendarLink = `${frontendUrl}/kalendarz/mock-calendar-id?okienko=${day}`;
  return {
    subject: dailyWindowSubject(day, calendarTitle),
    html: buildDailyWindowEmail({
      day,
      year,
      taskTitle,
      taskBody,
      calendarTitle,
      progressPercent: Math.round((day / 24) * 100),
      calendarLink,
    }),
    text: buildDailyWindowEmailText({
      day,
      year,
      taskTitle,
      taskBody,
      calendarTitle,
      calendarLink,
    }),
  };
}

function mockCollaborationInvite() {
  const payload = {
    inviterEmail: 'anna.kowalska@example.com',
    inviteeHasAccount: true,
  };
  return {
    subject: 'Zaproszenie do współpracy w e-Advent',
    html: buildCollaborationInviteEmail(payload),
    text: buildCollaborationInviteEmailText(payload),
  };
}

const PREVIEW_BUILDERS = {
  order_confirmation: mockOrderConfirmation,
  interactive_access: mockInteractiveAccess,
  shipment_prepared: mockShipmentPrepared,
  shipping: mockShipping,
  daily_window: mockDailyWindow,
  collaboration_invite: mockCollaborationInvite,
};

function listEmailTemplates() {
  return TEMPLATES.map((t) => ({ ...t }));
}

function getEmailTemplatePreview(id) {
  const meta = TEMPLATES.find((t) => t.id === id);
  const builder = PREVIEW_BUILDERS[id];
  if (!meta || !builder) return null;
  const rendered = builder();
  return {
    ...meta,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    mocked: true,
  };
}

module.exports = {
  listEmailTemplates,
  getEmailTemplatePreview,
  TEMPLATES,
};

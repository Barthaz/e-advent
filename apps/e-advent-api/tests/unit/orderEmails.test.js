const {
  escapeHtml,
  emailShell,
  getTaskText,
  dailyWindowSubject,
  buildOrderConfirmationEmail,
  buildInteractiveAccessEmail,
  buildDailyWindowEmail,
  buildShippingEmail,
  buildCollaborationInviteEmail,
} = require('../../services/orderEmails');

describe('orderEmails templates', () => {
  test('escapeHtml encodes markup', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('emailShell includes logo, parchment bg and brand colors', () => {
    const html = emailShell({
      title: 'Test',
      subtitle: 'Sub',
      preheader: 'Preview',
      bodyHtml: '<p>Hello</p>',
      logoUrl: 'https://e-advent.pl/assets/brand/eadvent-logo.png',
    });
    expect(html).toContain('https://e-advent.pl/assets/brand/eadvent-logo.png');
    expect(html).toContain('https://e-advent.pl/assets/mail-template.png');
    expect(html).toContain('https://e-advent.pl/assets/mail-template-slim.png');
    expect(html).toContain('mail-bg');
    expect(html).toContain('#0d4a2e');
    expect(html).toContain('color-scheme" content="light only');
    expect(html).toContain('color-scheme: light only');
    expect(html).toContain('#f7f2ea');
    expect(html).toContain('rgba(255,255,255,0.35)');
    expect(html).toContain('Hello');
    expect(html).toContain('e-Advent');
  });

  test('order confirmation and access emails share the shell', () => {
    const confirmation = buildOrderConfirmationEmail({
      orderId: 'ord-1',
      items: [{ sku: 'scratch-a4', quantity: 1, unitPrice: 49 }],
      shipping: { fullName: 'Jan', street: 'ul. 1', city: 'Warszawa', postalCode: '00-001', phone: '500' },
      amount: 54,
      shippingAmount: 5,
      hasPhysical: true,
      deliveryType: 'poczta_polska',
      logoUrl: 'https://e-advent.pl/assets/brand/eadvent-logo.png',
    });
    const access = buildInteractiveAccessEmail({
      calendarTitle: 'Mój kalendarz',
      calendarLink: 'https://e-advent.pl/kalendarz/abc',
      accessCode: 'ABC123',
      logoUrl: 'https://e-advent.pl/assets/brand/eadvent-logo.png',
    });
    expect(confirmation).toContain('ord-1');
    expect(confirmation).toContain('Poczta Polska');
    expect(access).toContain('ABC123');
    expect(access).toContain('Otwórz kalendarz');
    expect(confirmation).toContain('#0d4a2e');
    expect(access).toContain('#0d4a2e');
  });

  test('daily window escapes task body and shows day medallion', () => {
    const html = buildDailyWindowEmail({
      day: 3,
      year: 2026,
      taskTitle: 'Dzień 3 — Test',
      taskBody: '<img src=x onerror=alert(1)>',
      calendarTitle: 'Test',
      progressPercent: 12,
      calendarLink: 'https://e-advent.pl/kalendarz/x',
      logoUrl: 'https://e-advent.pl/assets/brand/eadvent-logo.png',
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
    expect(html).toContain('day-number');
    expect(html).toContain('>3</div>');
    expect(html).toContain('Otwarto 3 z 24 okienek');
    expect(html).toContain('Zobacz online');
    expect(dailyWindowSubject(3, 'Test')).toContain('Dzień 3');
  });

  test('daily special window uses addon CTA and does not spoiler the engine', () => {
    const html = buildDailyWindowEmail({
      day: 5,
      year: 2026,
      taskTitle: 'Dzień 5 — Test',
      taskBody: 'Treść z maila',
      calendarTitle: 'Test',
      progressPercent: 21,
      calendarLink: 'https://e-advent.pl/kalendarz/x?okienko=5',
      isSpecial: true,
    });
    expect(html).toContain('Otwórz dodatek');
    expect(html).toContain('okienko=5');
    expect(html).toContain('interaktywny dodatek');
    expect(html).not.toContain('Zobacz online');
  });

  test('shipping email includes tracking number', () => {
    const html = buildShippingEmail({
      orderId: 'ord-2',
      items: [{ sku: 'santa-letter', quantity: 1, unitPrice: 29 }],
      trackingNumber: 'PX123456789PL',
      deliveryType: 'courier_inpost',
      shipping: { fullName: 'Anna', street: 'ul. 2', city: 'Kraków', postalCode: '30-001' },
      logoUrl: 'https://e-advent.pl/assets/brand/eadvent-logo.png',
    });
    expect(html).toContain('PX123456789PL');
    expect(html).toContain('Kurier InPost');
  });

  test('collaboration invite uses shared shell', () => {
    const html = buildCollaborationInviteEmail({
      inviterEmail: 'a@b.c',
      inviteeHasAccount: true,
      logoUrl: 'https://e-advent.pl/assets/brand/eadvent-logo.png',
    });
    expect(html).toContain('a@b.c');
    expect(html).toContain('#0d4a2e');
  });

  test('getTaskText reads mixed task fields', () => {
    expect(getTaskText({ task: 'A' })).toBe('A');
    expect(getTaskText({ title: 'B' })).toBe('B');
    expect(getTaskText({ content: 'C' })).toBe('C');
  });
});

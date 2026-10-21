const {
  listEmailTemplates,
  getEmailTemplatePreview,
} = require('../../services/emailTemplates');

describe('emailTemplates catalog', () => {
  test('lists all known templates', () => {
    const list = listEmailTemplates();
    expect(list.map((t) => t.id)).toEqual([
      'order_confirmation',
      'interactive_access',
      'shipment_prepared',
      'shipping',
      'daily_window',
      'collaboration_invite',
    ]);
  });

  test('shipment prepared preview links InPost tracking', () => {
    const preview = getEmailTemplatePreview('shipment_prepared');
    expect(preview.html).toContain('inpost.pl/sledzenie-przesylek?number=520000012345678901234567');
    expect(preview.text).toContain('KRA01M');
  });

  test('preview renders full HTML with mock order number', () => {
    const preview = getEmailTemplatePreview('order_confirmation');
    expect(preview).not.toBeNull();
    expect(preview.mocked).toBe(true);
    expect(preview.html).toContain('000042');
    expect(preview.html).toContain('mail-template.png');
    expect(preview.html).toContain('Anna Kowalska');
    expect(preview.text).toContain('000042');
  });

  test('unknown template returns null', () => {
    expect(getEmailTemplatePreview('nope')).toBeNull();
  });
});

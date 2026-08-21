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
      'shipping',
      'daily_window',
      'collaboration_invite',
    ]);
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

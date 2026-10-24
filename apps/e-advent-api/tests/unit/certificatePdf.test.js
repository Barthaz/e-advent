const {
  formatCertificateLabel,
  formatCertificateSerial,
  normalizeVariant,
  certificateFilename,
} = require('../../services/certificate/certificatePdf');

describe('certificate PDF helpers', () => {
  test('normalizes ON/ONA and gender aliases', () => {
    expect(normalizeVariant('ON')).toBe('on');
    expect(normalizeVariant('ona')).toBe('ona');
    expect(normalizeVariant('męski')).toBe('on');
    expect(normalizeVariant('damski')).toBe('ona');
    expect(normalizeVariant('girl')).toBe('ona');
    expect(normalizeVariant('nope')).toBeNull();
  });

  test('formats SN-2026 serials with six digits', () => {
    expect(formatCertificateSerial(1)).toBe('SN-2026-000001');
    expect(formatCertificateLabel(1284)).toBe('CERTYFIKAT NR: SN-2026-001284');
    expect(certificateFilename({ variant: 'ona', serialNumber: 7 })).toBe(
      'certyfikat-SN-2026-000007-ona.pdf',
    );
  });

  test('rejects invalid serials', () => {
    expect(() => formatCertificateSerial(0)).toThrow('Nieprawidłowy numer');
    expect(() => formatCertificateSerial(1.5)).toThrow('Nieprawidłowy numer');
  });
});

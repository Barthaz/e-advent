const { corsAllowlist } = require('../../config/app');

test('production panel and storefront origins are always on the CORS allowlist', () => {
  expect(corsAllowlist).toContain('https://e-advent.pl');
  expect(corsAllowlist).toContain('https://www.e-advent.pl');
  expect(corsAllowlist).toContain('https://panel.e-advent.pl');
  expect(corsAllowlist).toContain('https://test.e-advent.pl');
});

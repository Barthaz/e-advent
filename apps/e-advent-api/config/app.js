/**
 * Konfiguracja aplikacji
 *
 * TESTING_MODE=true  → baza testowa + Stripe test + otwarty CORS
 * TESTING_MODE=false → baza produkcyjna + Stripe live + CORS allowlist
 */

const testingMode = process.env.TESTING_MODE === 'true';

const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const panelUrl = (process.env.PANEL_URL || 'http://localhost:5174').replace(/\/$/, '');

function withWwwVariant(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.startsWith('www.')) return null;
    if (parsed.hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
      return null;
    }
    parsed.hostname = `www.${parsed.hostname}`;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function parseExtraOrigins(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const corsAllowlist = Array.from(
  new Set(
    [frontendUrl, panelUrl, withWwwVariant(frontendUrl), ...parseExtraOrigins(process.env.CORS_ORIGINS)].filter(
      Boolean,
    ),
  ),
);

const emailLogoUrl =
  process.env.EMAIL_LOGO_URL || 'https://e-advent.pl/assets/brand/eadvent-logo.png';

/**
 * Aktywne credentiale MySQL zależne od TESTING_MODE.
 * Host/port są wspólne; database/user/password przełączają się na wariant TEST_*.
 */
const getMysqlConfig = () => {
  const host = process.env.MYSQL_HOST || 'h34.seohost.pl';
  const port = parseInt(process.env.MYSQL_PORT || '3306', 10);

  if (testingMode) {
    return {
      host,
      port,
      database: process.env.MYSQL_TEST_DATABASE || process.env.MYSQL_DATABASE || 'srv74754_e-advent-test',
      user: process.env.MYSQL_TEST_USER || process.env.MYSQL_USER || 'srv74754_e-advent-test',
      password: process.env.MYSQL_TEST_PASSWORD || process.env.MYSQL_PASSWORD || '',
    };
  }

  return {
    host,
    port,
    database: process.env.MYSQL_DATABASE || 'srv74754_e-advent',
    user: process.env.MYSQL_USER || 'srv74754_e-advent',
    password: process.env.MYSQL_PASSWORD || '',
  };
};

/**
 * Aktywne klucze Stripe zależne od TESTING_MODE.
 * Preferuje STRIPE_TEST_* / STRIPE_LIVE_*, z fallbackiem do starych nazw STRIPE_*.
 */
const getStripeConfig = () => {
  if (testingMode) {
    return {
      secretKey:
        process.env.STRIPE_TEST_SECRET_KEY
        || process.env.STRIPE_SECRET_KEY
        || '',
      publishableKey:
        process.env.STRIPE_TEST_PUBLISHABLE_KEY
        || process.env.STRIPE_PUBLISHABLE_KEY
        || '',
      webhookSecret:
        process.env.STRIPE_TEST_WEBHOOK_SECRET
        || process.env.STRIPE_WEBHOOK_SECRET
        || '',
      mode: 'test',
    };
  }

  return {
    secretKey:
      process.env.STRIPE_LIVE_SECRET_KEY
      || process.env.STRIPE_SECRET_KEY
      || '',
    publishableKey:
      process.env.STRIPE_LIVE_PUBLISHABLE_KEY
      || process.env.STRIPE_PUBLISHABLE_KEY
      || '',
    webhookSecret:
      process.env.STRIPE_LIVE_WEBHOOK_SECRET
      || process.env.STRIPE_WEBHOOK_SECRET
      || '',
    mode: 'live',
  };
};

module.exports = {
  testingMode,
  frontendUrl,
  panelUrl,
  corsAllowlist,
  emailLogoUrl,
  getMysqlConfig,
  getStripeConfig,
};

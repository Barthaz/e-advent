process.env.NODE_ENV = 'test';
process.env.VERCEL = '1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests';
process.env.JWT_EXPIRES_IN = '8h';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_dummy';
process.env.FRONTEND_URL = 'https://e-advent.pl';
// testingMode default false — X-04 expects this unless TESTING_MODE=true
delete process.env.TESTING_MODE;

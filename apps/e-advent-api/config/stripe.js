const { testingMode, getStripeConfig } = require('./app');

const stripeConfig = getStripeConfig();

// Ujednolić process.env, żeby istniejące route'y (webhook itd.) brały aktywne klucze
process.env.STRIPE_SECRET_KEY = stripeConfig.secretKey;
process.env.STRIPE_PUBLISHABLE_KEY = stripeConfig.publishableKey;
process.env.STRIPE_WEBHOOK_SECRET = stripeConfig.webhookSecret;

const stripe = require('stripe')(stripeConfig.secretKey || undefined);

if (!stripeConfig.secretKey) {
  console.warn('⚠️  WARNING: Stripe secret key is not set for current mode');
  console.warn(
    testingMode
      ? '   Set STRIPE_TEST_SECRET_KEY (or STRIPE_SECRET_KEY) in .env'
      : '   Set STRIPE_LIVE_SECRET_KEY (or STRIPE_SECRET_KEY) in .env'
  );
} else if (!stripeConfig.secretKey.startsWith('sk_')) {
  console.warn('⚠️  WARNING: Stripe secret key does not start with "sk_"');
} else {
  const expectedPrefix = testingMode ? 'sk_test_' : 'sk_live_';
  if (!stripeConfig.secretKey.startsWith(expectedPrefix)) {
    console.warn(
      `⚠️  WARNING: TESTING_MODE=${testingMode} but Stripe key prefix is not ${expectedPrefix}`
    );
  }
  console.log(`✅ Stripe configured [${stripeConfig.mode}]`);
}

module.exports = stripe;
module.exports.stripeConfig = stripeConfig;

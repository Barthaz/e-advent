require('dotenv').config();
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);
const secret = process.env.STRIPE_TEST_WEBHOOK_SECRET;

(async () => {
  console.log('secret_prefix', (secret || '').slice(0, 12), 'len', (secret || '').length);
  const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });
  for (const w of endpoints.data) {
    console.log('endpoint', w.id, w.status, w.url);
  }
  const ours = endpoints.data.find((w) => w.url.includes('apie-advent.vercel.app') && w.status === 'enabled');
  if (!ours) {
    console.log('no enabled apie-advent endpoint');
    process.exit(1);
  }

  const payload = JSON.stringify({
    id: 'evt_probe_local',
    object: 'event',
    api_version: '2025-07-30.basil',
    created: Math.floor(Date.now() / 1000),
    type: 'payment_intent.succeeded',
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    data: { object: { id: 'pi_probe_local', object: 'payment_intent', status: 'succeeded', metadata: {} } },
  });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  stripe.webhooks.constructEvent(payload, header, secret);
  console.log('local_verify: OK');

  const r = await fetch('https://apie-advent.vercel.app/api/stripe/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': header },
    body: payload,
  });
  console.log('vercel_status', r.status);
  console.log('vercel_body', (await r.text()).slice(0, 500));

  // Ask Stripe to redeliver a real event to our endpoint
  const eventId = 'evt_3UT5dcDLGQdtmhyC0GlhmtSV';
  const retry = await fetch(`https://api.stripe.com/v1/events/${eventId}/retry`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_TEST_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `webhook_endpoint=${ours.id}`,
  });
  console.log('stripe_retry_status', retry.status);
  console.log('stripe_retry_body', (await retry.text()).slice(0, 400));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

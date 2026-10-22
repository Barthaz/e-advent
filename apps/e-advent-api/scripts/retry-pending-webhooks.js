require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);
const { query } = require('../config/database');

(async () => {
  const [orders] = await query(
    `SELECT id, order_number, status, stripe_payment_intent_id
     FROM orders WHERE status = 'pending' AND stripe_payment_intent_id IS NOT NULL
     ORDER BY order_number DESC LIMIT 10`
  );
  const endpoints = (await stripe.webhookEndpoints.list({ limit: 20 })).data
    .filter((w) => w.status === 'enabled' && w.url.includes('apie-advent.vercel.app'));
  console.log('pending_orders', orders.map((o) => `${o.order_number}:${o.stripe_payment_intent_id}`).join(' | '));
  console.log('endpoints', endpoints.map((w) => w.id).join(', '));

  // Build PI -> event map from recent succeeded events
  const piToEvent = new Map();
  let startingAfter;
  for (let page = 0; page < 5; page++) {
    const batch = await stripe.events.list({
      type: 'payment_intent.succeeded',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const e of batch.data) {
      const pi = e.data?.object?.id;
      if (pi && !piToEvent.has(pi)) piToEvent.set(pi, e.id);
    }
    if (!batch.has_more || !batch.data.length) break;
    startingAfter = batch.data[batch.data.length - 1].id;
  }

  for (const order of orders) {
    const eventId = piToEvent.get(order.stripe_payment_intent_id);
    if (!eventId) {
      console.log('order', order.order_number, 'NO_EVENT');
      continue;
    }
    console.log('order', order.order_number, 'event', eventId);
    for (const ep of endpoints) {
      const res = await fetch(`https://api.stripe.com/v1/events/${eventId}/retry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_TEST_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `webhook_endpoint=${ep.id}`,
      });
      console.log('  retry', ep.id, res.status, (await res.text()).slice(0, 60).replace(/\s+/g, ' '));
    }
  }

  await new Promise((r) => setTimeout(r, 5000));
  const nums = orders.map((o) => o.order_number);
  const [after] = await query(
    `SELECT order_number, status, updated_at FROM orders WHERE order_number IN (${nums.map(() => '?').join(',')}) ORDER BY order_number`,
    nums
  );
  console.log('after');
  for (const row of after) {
    console.log(' ', row.order_number, row.status, row.updated_at);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

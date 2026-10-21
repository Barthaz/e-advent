// In-memory DB/Stripe boundary for service and HTTP tests. No network or MySQL.
const { randomUUID } = require('node:crypto');
module.exports = function checkoutStore() {
  const db = require('../../config/database');
  const Payment = require('../../models/Payment');
  const stripe = require('../../config/stripe');
  const orders = new Map(), sessions = new Map(), intents = new Map();
  const mutexes = new Map();
  db.withNamedLocks.mockImplementation(async (keys, fn) => {
    const releases = [];
    for (const key of [...new Set(keys)].sort()) {
      const previous = mutexes.get(key) || Promise.resolve();
      let release;
      const next = new Promise(resolve => { release = resolve; });
      mutexes.set(key, previous.then(() => next));
      await previous;
      releases.push(release);
    }
    try { return await fn(); }
    finally { releases.reverse().forEach(release => release()); }
  });
  db.withTransaction.mockImplementation(fn => fn());
  db.query.mockImplementation(async (sql, args) => {
    if (sql.startsWith('SELECT order_id FROM checkout_sessions')) return [sessions.has(args[0]) ? [{ order_id: sessions.get(args[0]) }] : []];
    if (sql.startsWith('INSERT INTO checkout_sessions')) sessions.set(args[0], args[1]);
    if (sql.startsWith('UPDATE orders SET stripe_payment_intent_id')) orders.get(args[1]).stripePaymentIntentId = args[0];
    return [[], []];
  });
  Payment.createPayment.mockImplementation(async data => {
    const order = { ...data, id: randomUUID(), orderNumber: orders.size + 1, orderNumberDisplay: String(orders.size + 1).padStart(6, '0'),
      status: 'pending', createdAt: new Date().toISOString() };
    orders.set(order.id, order);
    return order;
  });
  Payment.findPaymentById.mockImplementation(async id => orders.get(id) || null);
  Payment.findPayments.mockImplementation(async ({ productId }) => [...orders.values()].filter(order => order.items.some(item => item.calendarId === productId)));
  Payment.updatePaymentStatus.mockImplementation(async (id, status) => {
    const order = [...orders.values()].find(order => order.stripePaymentIntentId === id);
    if (order && order.status !== 'succeeded') order.status = status;
    return order;
  });
  stripe.paymentIntents.create.mockImplementation(async (params, options) => {
    const existing = [...intents.values()].find(intent => intent.key === options.idempotencyKey);
    if (existing) return existing;
    const id = `pi_${intents.size + 1}`;
    const intent = { ...params, id, key: options.idempotencyKey, client_secret: `${id}_secret`, status: 'requires_payment_method' };
    intents.set(id, intent);
    return intent;
  });
  stripe.paymentIntents.retrieve.mockImplementation(async id => intents.get(id));
  stripe.paymentIntents.cancel?.mockImplementation(async id => {
    const intent = intents.get(id);
    if (['succeeded', 'processing'].includes(intent.status)) throw new Error('Cannot cancel');
    intent.status = 'canceled';
    return intent;
  });
  return { orders, sessions, intents };
};

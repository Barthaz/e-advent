/* Offline audit probes. No real database, Stripe, SMTP or external HTTP calls.
 * These assertions CHARACTERIZE defects present on 2026-10-16; they are not
 * acceptance tests. A failed assertion after a fix can mean the defect is gone.
 * Run from repository root: node docs/audit-2026-10-16/probes.cjs
 */
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const api = createRequire(path.resolve(__dirname, '../../apps/e-advent-api/app.js'));
process.env.NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = 'sk_test_OFFLINE_AUDIT';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_OFFLINE_AUDIT';
const results = [];
const quietLog = console.log;
console.log = console.warn = console.error = () => {};
function stub(moduleName, exports) {
  const id = api.resolve(moduleName);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
let calendar;
let order;
let failDb = false;
let mails = 0;
let codeSequence = 0;
let event;
let pdfPayload;
let fetchTargets = [];
const calendarModel = {
  createCalendar: async ({ data }) => (calendar = { id: 'audit-calendar', _id: 'audit-calendar', data, status: 'pending', editToken: 'audit-edit-token' }),
  findCalendarById: async id => calendar && id === calendar.id ? calendar : null,
  findCalendarByEmailAndAccessCode: async (email, code) => calendar && calendar.data.email === email && calendar.accessCode === code ? calendar : null,
  updateCalendar: async (id, updates) => Object.assign(calendar, updates),
  verifyEditToken: (c, token) => !!token && token === c.editToken,
  openTask: async (id, day) => {
    calendar.data.tasks = calendar.data.tasks.map(t => t.day === day ? { ...t, status: 'opened' } : t);
    return calendar;
  },
};
stub('./config/database', { query: async () => { throw new Error('Unexpected DB access blocked by audit'); } });
stub('./models/Calendar', calendarModel);
stub('./models/Payment', {
  findPayments: async () => [],
  findPaymentByStripeId: async () => { if (failDb) throw new Error('Offline simulated DB failure'); return order; },
  updatePayment: async (id, updates) => Object.assign(order, updates),
  createPayment: async () => { throw new Error('Offline simulated INSERT failure'); },
});
stub('./config/email', { sendEmail: async () => { mails++; return { messageId: 'offline' }; } });
stub('./config/stripe', {
  webhooks: { constructEvent: () => event },
  paymentIntents: {
    create: async () => ({ id: 'pi_OFFLINE', client_secret: 'OFFLINE_SECRET' }),
  },
});
stub('./services/orderMailer', {
  generateAccessCode: () => `TEST${++codeSequence}`,
  sendPaidOrderEmails: async () => { mails++; return { sent: 1 }; },
});
stub('./services/special/DocumentRegistry', {
  resolveContentPack: () => ({}),
  renderSpecialPdf: async (descriptor, payload) => {
    pdfPayload = payload;
    return { buffer: Buffer.from('%PDF OFFLINE STUB'), filename: 'offline.pdf' };
  },
});
stub('./services/special/SpecialProgressStore', {
  getProgress: async () => ({ payload: { fields: { message: 'SEALED_AUDIT_CONTENT' } } }),
});
stub('./services/special/DateGateService', {
  getSealedContent: async () => ({ sealed: true, revealed: false, revealAt: '2099-12-24T17:00:00.000Z', payload: null }),
  resolveRevealAt: () => new Date('2099-12-24'),
});
const express = api('express');
const request = api('supertest');
const app = express();
app.use((req, res, next) => req.path === '/stripe/webhook' ? next() : express.json()(req, res, next));
app.use('/calendars', api('./routes/calendars'));
app.use('/stripe', api('./routes/stripe'));
app.use('/special', api('./routes/specialPreview').router);
const auth = api('./middleware/authCalendarAccess');
app.get('/identity', auth, (req, res) => res.json({ email: req.profile.email }));
async function probe(name, fn) {
  await fn();
  results.push({ name, result: 'CONFIRMED', dependencies: 'offline stubs' });
}
async function main() {
  await probe('A01: createFree supplies credentials for an unverified email identity', async () => {
    const created = await request(app).post('/calendars').send({ calendar: {
      email: 'victim@example.invalid', title: 'Audit', sku: 'interactive', tasks: [{ day: 24, title: 'Future', status: 'closed' }],
    } });
    assert.equal(created.status, 201);
    const free = await request(app).post('/calendars/createFree').send({
      calendarId: calendar.id, email: 'attacker@example.invalid', promoCode: 'rabat100',
    });
    assert.equal(free.status, 200);
    assert.ok(free.body.accessCode);
    const identity = await request(app).get('/identity').set('X-Access-Email', 'victim@example.invalid').set('X-Access-Code', free.body.accessCode);
    assert.equal(identity.status, 200);
    assert.equal(identity.body.email, 'victim@example.invalid');
  });
  await probe('A02: pending calendar day 24 opens without authentication/date/payment checks', async () => {
    calendar.status = 'pending';
    const response = await request(app).put(`/calendars/${calendar.id}/open/24`);
    assert.equal(response.status, 200);
    assert.equal(calendar.data.tasks[0].status, 'opened');
  });
  await probe('A03: checkout resolves foreign calendar without edit-token proof', async () => {
    const { resolveCheckoutItems } = api('./services/orderCheckout');
    const resolved = await resolveCheckoutItems({ productId: calendar.id, customerEmail: 'attacker@example.invalid' });
    assert.equal(resolved.errors, undefined);
    assert.equal(resolved.items[0].calendarId, calendar.id);
  });
  await probe('A04: duplicate webhook rotates access code and sends email again', async () => {
    order = { id: 'order-offline', status: 'pending', amount: 9, currency: 'pln', sku: 'interactive', productId: calendar.id,
      items: [{ sku: 'interactive', quantity: 1, calendarId: calendar.id }] };
    event = { id: 'evt_OFFLINE_DUPLICATE', type: 'payment_intent.succeeded', data: { object: { id: 'pi_OFFLINE', amount: 900, currency: 'pln' } } };
    const beforeMails = mails;
    const a = await request(app).post('/stripe/webhook').set('Content-Type', 'application/json').send('{}');
    const firstCode = calendar.accessCode;
    const b = await request(app).post('/stripe/webhook').set('Content-Type', 'application/json').send('{}');
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.notEqual(calendar.accessCode, firstCode);
    assert.equal(mails - beforeMails, 2);
  });
  await probe('A05: webhook returns 200 when database operation fails', async () => {
    failDb = true;
    const response = await request(app).post('/stripe/webhook').set('Content-Type', 'application/json').send('{}');
    failDb = false;
    assert.equal(response.status, 200);
    assert.equal(response.body.received, true);
  });
  await probe('A06: checkout returns client secret despite failing to persist order', async () => {
    order = null;
    calendar.status = 'pending';
    const response = await request(app).post('/stripe/create-payment-intent').send({
      amount: 9, currency: 'pln', customerEmail: 'buyer@example.invalid', orderId: 'offline', productId: calendar.id,
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.clientSecret, 'OFFLINE_SECRET');
  });
  await probe('A07: public preview PDF endpoint invokes renderer without purchase/auth', async () => {
    const response = await request(app).post('/special/preview/pdf').send({ catalogTaskId: 'set-6-task-1' });
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /application\/pdf/);
  });
  await probe('A08: PDF route passes sealed content to renderer before reveal date', async () => {
    calendar.status = 'succeeded';
    calendar.isFree = false;
    calendar.data.tasks = [{ day: 1, catalogTaskId: 'set-6-task-1', title: 'Letter', status: 'opened' }];
    const response = await request(app).post(`/calendars/${calendar.id}/days/1/special/export/pdf`).send({});
    assert.equal(response.status, 200);
    assert.equal(pdfPayload.fields.message, 'SEALED_AUDIT_CONTENT');
  });
  await probe('A09: scratch image resolver accepts loopback URL (fetch stub; no request sent)', async () => {
    const originalFetch = global.fetch;
    global.fetch = async url => { fetchTargets.push(String(url)); return { ok: true, arrayBuffer: async () => Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]).buffer }; };
    try {
      await api('./services/scratch/scratchAssets').resolveScratchDesignImage('http://127.0.0.1:9876/audit-only.png');
      assert.deepEqual(fetchTargets, ['http://127.0.0.1:9876/audit-only.png']);
    } finally { global.fetch = originalFetch; }
  });
  await probe('A10: unauthenticated preview forwards a private-network image URL to fetch (stub)', async () => {
    delete require.cache[api.resolve('./services/special/DocumentRegistry')];
    delete require.cache[api.resolve('./routes/specialPreview')];
    stub('@react-pdf/renderer', {
      Font: { register() {}, registerHyphenationCallback() {} },
      StyleSheet: { create: x => x },
      Document: 'Document', Page: 'Page', Text: 'Text', View: 'View', Image: 'Image',
      renderToBuffer: async () => Buffer.from('%PDF OFFLINE RENDER STUB'),
    });
    const previewApp = express();
    previewApp.use(express.json());
    previewApp.use('/special', api('./routes/specialPreview').router);
    const originalFetch = global.fetch;
    fetchTargets = [];
    global.fetch = async url => { fetchTargets.push(String(url)); return { ok: true, arrayBuffer: async () => Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]).buffer }; };
    try {
      const response = await request(previewApp).post('/special/preview/pdf').send({
        catalogTaskId: 'set-1-task-17', variant: 'INK_SAVER',
        payload: { photos: { then: { url: 'http://127.0.0.1:9876/audit-only.png' } } },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(fetchTargets, ['http://127.0.0.1:9876/audit-only.png']);
    } finally { global.fetch = originalFetch; }
  });
  quietLog(JSON.stringify({ warning: 'CONFIRMED means defect reproduced, NOT application healthy. No real services used.', results }, null, 2));
}
main().catch(error => { quietLog(JSON.stringify({ results, failedProbe: error.stack }, null, 2)); process.exitCode = 1; });

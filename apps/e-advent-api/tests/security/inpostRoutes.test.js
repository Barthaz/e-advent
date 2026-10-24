jest.mock('../../config/database', () => ({ query: jest.fn(), withNamedLocks: jest.fn() }));
jest.mock('../../services/inpostFulfillment', () => ({ operate: jest.fn(), advanceShipment: jest.fn() }));
const express = require('express');
const request = require('supertest');
const db = require('../../config/database');
const { operate, advanceShipment } = require('../../services/inpostFulfillment');
const app = express();
app.use(express.json());
app.use('/shipping', require('../../routes/shipping'));
app.use('/inpost', require('../../routes/inpostWebhook'));
const admin = express.Router();
require('../../routes/adminInpost')(admin, require('../../middleware/authAdmin'));
app.use('/admin', admin);
beforeEach(() => {
  require('../helpers/inpostFixture')();
  process.env.INPOST_WEBHOOK_SECRET = 'a'.repeat(64);
  process.env.INPOST_GEOWIDGET_TOKEN = 'public-map-token';
  db.query.mockResolvedValue([[{ order_id: 'uuid-order' }]]);
  operate.mockResolvedValue({ state: 'confirmed' });
  advanceShipment.mockResolvedValue({ state: 'confirmed' });
});
const event = { event: 'shipment_status_changed', organization_id: 123, payload: { shipment_id: 456, status: 'delivered', tracking_number: 'untrusted' } };
test('public configuration exposes only public map token and environment', async () => {
  const res = await request(app).get('/shipping/config');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ environment: 'sandbox', geowidgetToken: 'public-map-token' });
  expect(JSON.stringify(res.body)).not.toContain('test-inpost-token');
});
test.each(['', '?token=wrong', `?token=${'ą'.repeat(64)}`])('webhook rejects absent or invalid secret: %s', async suffix => {
  const res = await request(app).post('/inpost/webhook' + suffix).send(event);
  expect(res.status).toBe(403);
  expect(advanceShipment).not.toHaveBeenCalled();
  expect(db.query).not.toHaveBeenCalled();
});
test('webhook treats event as hint and selects order by organization, environment and provider ID', async () => {
  const res = await request(app).post('/inpost/webhook?token=' + 'a'.repeat(64)).send(event);
  expect(res.status).toBe(200);
  expect(db.query.mock.calls[0][1]).toEqual(['sandbox', '123', '456']);
  expect(advanceShipment).toHaveBeenCalledWith('uuid-order');
  expect(advanceShipment.mock.calls[0]).not.toContain(event.payload);
});
test('provider failure returns retryable response, not false acknowledgment', async () => {
  advanceShipment.mockRejectedValueOnce(new Error('ShipX unavailable'));
  const res = await request(app).post('/inpost/webhook?token=' + 'a'.repeat(64)).send(event);
  expect(res.status).toBe(503);
});
test('event from another organization cannot change local order', async () => {
  const res = await request(app).post('/inpost/webhook?token=' + 'a'.repeat(64)).send({ ...event, organization_id: 999 });
  expect(res.status).toBe(400);
  expect(advanceShipment).not.toHaveBeenCalled();
});
test.each(['create', 'buy', 'refresh', 'offers', 'reconcile', 'generate', 'dispatch'])('admin %s requires authentication', async action => {
  expect((await request(app).post(`/admin/orders/uuid/inpost/${action}`).send({})).status).toBe(401);
  expect(operate).not.toHaveBeenCalled();
});
test('status refresh cannot be read without administrator credentials', async () => {
  expect((await request(app).get('/admin/orders/uuid/inpost/refresh')).status).toBe(401);
  expect(operate).not.toHaveBeenCalled();
});
test('label download cannot be accessed without administrator credentials', async () => {
  expect((await request(app).get('/admin/orders/uuid/inpost/label')).status).toBe(401);
  expect(operate).not.toHaveBeenCalled();
});

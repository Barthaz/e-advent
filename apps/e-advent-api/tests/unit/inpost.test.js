const inpost = require('../../services/inpost');
const setup = require('../helpers/inpostFixture');
const { orderFingerprint } = require('../../services/orderIdentity');
const items = [{ sku: 'santa-letter', quantity: 1 }];
const address = { firstName: 'Anna', lastName: 'Nowak', phone: '+48 500 600 700', street: 'Testowa', buildingNumber: '7', apartmentNumber: '2', city: 'Kraków', postalCode: '30-001', country: 'PL' };
let originalFetch;
beforeEach(() => { setup(); originalFetch = global.fetch; global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });
test('tariff is server configured; quantity and certificate occupy parcel capacity', () => {
  const profiles = JSON.parse(process.env.INPOST_PACKAGES_JSON);
  profiles[0].capacity = { 'santa-letter': 2, 'santa-certificate': 2 };
  process.env.INPOST_PACKAGES_JSON = JSON.stringify(profiles);
  expect(inpost.quote(items, 'courier_inpost').price).toBe(5);
  expect(() => inpost.quote([{ sku: 'santa-letter', quantity: 2 }, { sku: 'santa-certificate', quantity: 1 }], 'courier_inpost')).toThrow('nie ma skonfigurowanej');
  expect(() => inpost.quote([{ sku: 'santa-letter', quantity: -1 }], 'courier_inpost')).toThrow('pozycja');
});
test('missing configuration fails closed rather than charging legacy five PLN', () => {
  delete process.env.INPOST_PACKAGES_JSON;
  expect(() => inpost.quote(items, 'courier_inpost')).toThrow('Brak cennika');
});
test('test payments cannot produce production InPost shipments', () => {
  process.env.INPOST_ENV = 'production';
  expect(() => inpost.config()).toThrow('muszą być zgodne');
});
test('large template allows rotation and C2C-only size D is not sold as a locker', () => {
  const p = JSON.parse(process.env.INPOST_PACKAGES_JSON);
  Object.assign(p[0], { length: 640, width: 410, height: 380 });
  process.env.INPOST_PACKAGES_JSON = JSON.stringify(p);
  expect(inpost.quote(items, 'parcel_inpost').parcel.template).toBe('large');
  Object.assign(p[0], { length: 800, width: 500, height: 500 });
  process.env.INPOST_PACKAGES_JSON = JSON.stringify(p);
  expect(inpost.quote(items, 'courier_inpost').parcel.template).toBe('xlarge');
  expect(() => inpost.quote(items, 'parcel_inpost')).toThrow('nie ma skonfigurowanej');
});
test('oversized package cannot be sent to locker', () => {
  const p = JSON.parse(process.env.INPOST_PACKAGES_JSON); p[0].length = 800;
  process.env.INPOST_PACKAGES_JSON = JSON.stringify(p);
  expect(() => inpost.quote(items, 'parcel_inpost')).toThrow('nie ma skonfigurowanej');
  expect(inpost.quote(items, 'courier_inpost').price).toBe(5);
});
test('courier uses structured address, normalized phone, and no client price', async () => {
  const delivery = await inpost.resolveDelivery(items, { ...setup(), price: 0 }, address, 'BUYER@example.com');
  expect(delivery.price).toBe(5);
  expect(delivery.receiver).toMatchObject({ phone: '500600700', email: 'buyer@example.com', address: { street: 'Testowa', building_number: '7', flat_number: '2', country_code: 'PL' } });
  expect(global.fetch).not.toHaveBeenCalled();
});
test('stale tariff must be requoted before Stripe', async () => {
  const old = setup();
  const p = JSON.parse(process.env.INPOST_PACKAGES_JSON); p[0].prices.courier_inpost = 19;
  process.env.INPOST_PACKAGES_JSON = JSON.stringify(p);
  await expect(inpost.resolveDelivery(items, old, address, 'buyer@example.com')).rejects.toMatchObject({ status: 409 });
});
test.each([{ phone: '123' }, { buildingNumber: '' }, { postalCode: '123' }, { country: 'DE' }, { firstName: '' }])('invalid recipient is rejected: %p', async patch => {
  await expect(inpost.resolveDelivery(items, setup(), { ...address, ...patch }, 'buyer@example.com')).rejects.toMatchObject({ status: 400 });
});
test('locker is validated in ShipX and address comes from provider, never client', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ name: 'KRA01M', display_name: 'Paczkomat KRA01M', status: 'Operating', type: ['parcel_locker'], functions: ['parcel_collect'], address: { line1: 'Poprawna 2', line2: 'Kraków' } }) });
  const q = inpost.quote(items, 'parcel_inpost');
  const d = await inpost.resolveDelivery(items, { type: 'parcel_inpost', pointId: 'KRA01M', address: 'FAKE', quoteKey: q.quoteKey }, address, 'buyer@example.com');
  expect(d.point.address).toBe('Poprawna 2, Kraków');
  expect(d.receiver.address).toBeUndefined();
  expect(global.fetch.mock.calls[0][0]).toBe('https://sandbox-api-gateway-pl.easypack24.net/v1/points/KRA01M');
});
test.each([{ status: 'NonOperating' }, { type: ['pop'] }, { type: ['parcel_locker'], partner_id: 33 }, { functions: [] }, { name: 'WRONG' }])('rejects unavailable/wrong points: %p', async patch => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ name: 'KRA01M', status: 'Operating', type: ['parcel_locker'], functions: ['parcel_collect'], ...patch }) });
  const q = inpost.quote(items, 'parcel_inpost');
  await expect(inpost.resolveDelivery(items, { type: 'parcel_inpost', pointId: 'KRA01M', quoteKey: q.quoteKey }, address, 'buyer@example.com')).rejects.toThrow('nie obsługuje');
});
test('delivery fingerprint survives MySQL JSON key ordering and detects point/recipient swaps', async () => {
  const d = await inpost.resolveDelivery(items, setup(), address, 'buyer@example.com');
  const order = { amount: 34, shippingAmount: 5, currency: 'pln', customerEmail: 'buyer@example.com', items: [{ ...items[0], unitPrice: 29 }], metadata: { inpostDelivery: d } };
  const hash = orderFingerprint(order);
  const sorted = Object.fromEntries(Object.entries(d).reverse());
  expect(orderFingerprint({ ...order, metadata: { inpostDelivery: sorted } })).toBe(hash);
  sorted.receiver = { ...sorted.receiver, email: 'other@example.com' };
  expect(orderFingerprint({ ...order, metadata: { inpostDelivery: sorted } })).not.toBe(hash);
});
test('adapter never follows redirects or retries mutations and rejects non-PDF labels', async () => {
  global.fetch.mockRejectedValueOnce(new Error('timeout containing secret'));
  await expect(inpost.request('/shipments/1/buy', { method: 'POST', body: { offer_id: 2 } })).rejects.toThrow('Nie udało');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch.mock.calls[0][1].redirect).toBe('error');
  global.fetch.mockResolvedValueOnce({ ok: true, arrayBuffer: async () => Buffer.from('<html>error</html>') });
  await expect(inpost.request('/shipments/1/label', { pdf: true })).rejects.toThrow('PDF');
});

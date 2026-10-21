'use strict';

const { getProduct } = require('../config/products');
const { createHash } = require('node:crypto');

function fail(message, status = 400) { return Object.assign(new Error(message), { status }); }
function config() {
  const environment = process.env.INPOST_ENV;
  if (!['sandbox', 'production'].includes(environment)) throw fail('Dostawa InPost nie jest jeszcze skonfigurowana.', 503);
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  if ((environment === 'production' && (process.env.TESTING_MODE === 'true' || stripeKey.startsWith('sk_test_')))
      || (environment === 'sandbox' && stripeKey.startsWith('sk_live_'))) throw fail('Środowiska InPost i płatności muszą być zgodne.', 503);
  const token = process.env.INPOST_API_TOKEN;
  const organizationId = process.env.INPOST_ORGANIZATION_ID;
  if (!token || !/^\d+$/.test(organizationId || '')) throw fail('Brak konfiguracji konta InPost.', 503);
  const courierService = process.env.INPOST_COURIER_SERVICE;
  if (!['inpost_courier_standard', 'inpost_courier_c2c'].includes(courierService)) throw fail('Brak konfiguracji usługi kurierskiej InPost.', 503);
  return { environment, token, organizationId, courierService,
    pointsBase: environment === 'production' ? 'https://api.inpost.pl/v1' : 'https://sandbox-api-gateway-pl.easypack24.net/v1',
    base: environment === 'production' ? 'https://api-shipx-pl.easypack24.net/v1' : 'https://sandbox-api-shipx-pl.easypack24.net/v1' };
}

// No arbitrary URLs, redirects, or automatic retries of mutations. In particular,
// ShipX creation/buy have no documented idempotency key.
async function request(path, { method = 'GET', body, pdf = false } = {}) {
  const c = config();
  try {
    const base = path.startsWith('/points/') ? c.pointsBase : c.base;
    const response = await fetch(base + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${c.token}`, Accept: pdf ? 'application/pdf' : 'application/json', 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw Object.assign(fail(`InPost odrzucił żądanie (HTTP ${response.status}). Sprawdź konfigurację lub przesyłkę w Managerze Paczek.`, 502), { providerStatus: response.status });
    if (!pdf) return await response.json();
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 10 * 1024 * 1024 || buffer.subarray(0, 5).toString() !== '%PDF-') throw fail('InPost nie zwrócił prawidłowej etykiety PDF.', 502);
    return buffer;
  } catch (error) {
    if (error.status) throw error;
    throw fail('Nie udało się potwierdzić odpowiedzi InPost. Odśwież status przesyłki.', 502);
  }
}

function profiles() {
  let data;
  try { data = JSON.parse(process.env.INPOST_PACKAGES_JSON || 'null'); } catch { /* handled below */ }
  if (!Array.isArray(data) || !data.length || data.length > 30) throw fail('Brak cennika i gabarytów dostawy InPost.', 503);
  return data.map(p => {
    const dimensions = [p.length, p.width, p.height].map(Number).sort((a, b) => a - b);
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(p.code || '') || dimensions.some(n => !Number.isFinite(n) || n <= 0)
      || dimensions[2] > 1200 || dimensions.reduce((a, b) => a + b, 0) > 2200
      || !(Number(p.weight) > 0 && Number(p.weight) <= 25) || !p.capacity || typeof p.capacity !== 'object'
      || Object.entries(p.capacity).some(([sku, n]) => !getProduct(sku) || !Number.isSafeInteger(n) || n < 1)) {
      throw fail('Nieprawidłowa konfiguracja opakowań InPost.', 503);
    }
    const sizes = [{ name: 'small', limits: [80, 380, 640] }, { name: 'medium', limits: [190, 380, 640] },
      { name: 'large', limits: [380, 410, 640] }, { name: 'xlarge', limits: [500, 500, 800] }];
    const template = sizes.find(s => dimensions.every((n, i) => n <= s.limits[i]))?.name;
    const fitsLocker = Boolean(template && template !== 'xlarge');
    return { ...p, dimensions, template, fitsLocker };
  });
}

// Gross PLN from the merchant's actual tariff (including fuel/other surcharges).
// Contract accounts can return null/default API prices, so never invent a price.
function quote(items, type) {
  const c = config();
  if (!['parcel_inpost', 'courier_inpost'].includes(type)) throw fail('Wybierz Paczkomat InPost lub kuriera InPost.');
  if (!Array.isArray(items) || !items.length || items.length > 100) throw fail('Nieprawidłowy koszyk.');
  const quantities = {};
  for (const item of items) {
    const product = getProduct(item.sku);
    if (!product || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) throw fail('Nieprawidłowa pozycja koszyka.');
    if (product.requiresShipping || product.letterAddonOnly) quantities[item.sku] = (quantities[item.sku] || 0) + item.quantity;
  }
  if (!Object.keys(quantities).length) throw fail('Ten koszyk nie wymaga przesyłki.');
  const candidates = profiles().filter(p => (type !== 'parcel_inpost' || p.fitsLocker)
    && (type !== 'courier_inpost' || c.courierService !== 'inpost_courier_c2c' || p.template)
    && Object.entries(quantities).reduce((sum, [sku, qty]) => sum + qty / (p.capacity[sku] || 0), 0) <= 1 + 1e-9
    && typeof p.prices?.[type] === 'number' && p.prices[type] > 0 && Number.isFinite(p.prices[type]));
  candidates.sort((a, b) => a.prices[type] - b.prices[type]);
  const p = candidates[0];
  if (!p) throw fail('Dla tego koszyka nie ma skonfigurowanej przesyłki. Zmień sposób dostawy lub skontaktuj się ze sklepem.');
  const price = Math.round(p.prices[type] * 100) / 100;
  const parcel = { dimensions: { length: p.length, width: p.width, height: p.height, unit: 'mm' }, weight: { amount: Number(p.weight), unit: 'kg' },
    ...(type === 'parcel_inpost' || c.courierService === 'inpost_courier_c2c' ? { template: p.template } : {}) };
  const result = { type, price, currency: 'PLN', profile: p.code, parcel,
    service: type === 'parcel_inpost' ? 'inpost_locker_standard' : c.courierService,
    environment: c.environment, organizationId: c.organizationId };
  return { ...result, quoteKey: createHash('sha256').update(JSON.stringify(result)).digest('hex') };
}

function text(value, max = 100) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (result.length > max) throw fail('Jedno z pól dostawy jest zbyt długie. Skróć je i spróbuj ponownie.');
  return result;
}
async function resolveDelivery(items, raw, address, email) {
  const q = quote(items, raw?.type);
  if (q.quoteKey !== raw?.quoteKey) throw fail('Cena dostawy uległa zmianie. Wybierz dostawę ponownie.', 409);
  const firstName = text(address?.firstName), lastName = text(address?.lastName);
  const phone = text(address?.phone).replace(/[\s()-]/g, '').replace(/^(\+48|0048)/, '');
  if (!firstName || !lastName || !/^[1-9]\d{8}$/.test(phone)) throw fail('Podaj imię, nazwisko i poprawny polski numer telefonu odbiorcy.');
  const receiver = { first_name: firstName, last_name: lastName, phone, email: text(email, 254).toLowerCase() };
  let point = null;
  if (q.type === 'parcel_inpost') {
    const code = text(raw.pointId, 30).toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw fail('Wybierz Paczkomat na mapie.');
    const p = await request(`/points/${encodeURIComponent(code)}`);
    if (p.name !== code || p.status !== 'Operating' || !(p.type?.includes('parcel_locker') || p.type?.includes('parcel_locker_only')) || p.type?.some(t => ['pop', 'parcel_locker_superpop'].includes(t)) || (p.partner_id != null && Number(p.partner_id) !== 0) || !p.functions?.includes('parcel_collect')) throw fail('Ten Paczkomat nie obsługuje odbioru. Wybierz inny punkt.');
    point = { id: code, name: text(p.display_name || code), address: text([p.address?.line1, p.address?.line2].filter(Boolean).join(', '), 250) };
  } else {
    const street = text(address?.street), building = text(address?.buildingNumber, 30), city = text(address?.city), postCode = text(address?.postalCode, 6);
    if (!street || !building || !city || !/^\d{2}-\d{3}$/.test(postCode) || (address?.country && address.country !== 'PL')) throw fail('Podaj ulicę, numer budynku, miasto i kod pocztowy w Polsce.');
    receiver.address = { street, building_number: building, flat_number: text(address?.apartmentNumber, 30) || null, city, post_code: postCode, country_code: 'PL' };
  }
  return { ...q, receiver, point };
}

function shipmentPayload(order) {
  const d = order.metadata?.inpostDelivery;
  if (!d) throw fail('Zamówienie nie ma zapisanej dostawy InPost.', 409);
  const c = config();
  if (d.environment !== c.environment || d.organizationId !== c.organizationId) throw fail('Zamówienie należy do innego środowiska lub konta InPost.', 409);
  return { receiver: d.receiver, parcels: [d.parcel], service: d.service,
    reference: `EA-${order.orderNumberDisplay}-${order.id}`, only_choice_of_offer: true,
    ...(d.point ? { custom_attributes: { target_point: d.point.id } } : {}) };
}

module.exports = { config, request, quote, resolveDelivery, shipmentPayload, fail };

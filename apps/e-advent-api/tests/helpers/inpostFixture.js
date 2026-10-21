// Deliberately artificial tariff and dimensions, only for isolated tests.
module.exports = function configureInpost() {
  process.env.INPOST_ENV = 'sandbox';
  process.env.INPOST_API_TOKEN = 'test-inpost-token';
  process.env.INPOST_ORGANIZATION_ID = '123';
  process.env.INPOST_COURIER_SERVICE = 'inpost_courier_c2c';
  process.env.INPOST_API_RATE_TAX = 'gross';
  process.env.INPOST_PACKAGES_JSON = JSON.stringify([{ code: 'fixture', length: 300, width: 220, height: 50, weight: 1,
    capacity: { 'santa-letter': 100, 'santa-certificate': 100, 'scratch-a3': 100, 'scratch-a4': 100 },
    prices: { parcel_inpost: 5, courier_inpost: 5 } }]);
  const { quote } = require('../../services/inpost');
  return { type: 'courier_inpost', quoteKey: quote([{ sku: 'santa-letter', quantity: 1 }], 'courier_inpost').quoteKey };
};

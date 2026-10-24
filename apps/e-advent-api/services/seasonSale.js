'use strict';

const { isCalendarsOnSale, isCalendarSku, LETTER_PROMO_CODE } = require('../config/products');

function calendarsCurrentlyOnSale(now) {
  if (process.env.EADVENT_CALENDARS_ON_SALE === '1') return true;
  if (process.env.EADVENT_CALENDARS_ON_SALE === '0') return false;
  return isCalendarsOnSale(now);
}

function calendarSaleClosedMessage() {
  return `Zamówienia kalendarzy przyjmiemy od 1 listopada. Tymczasem listy do Mikołaja są 20% taniej z kodem ${LETTER_PROMO_CODE}.`;
}

function assertCalendarsPurchasable(items) {
  if (calendarsCurrentlyOnSale() || !Array.isArray(items)) return null;
  if (!items.some((item) => isCalendarSku(item.sku))) return null;
  return calendarSaleClosedMessage();
}

module.exports = {
  calendarsCurrentlyOnSale,
  calendarSaleClosedMessage,
  assertCalendarsPurchasable,
};

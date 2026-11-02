'use strict';

const { isCalendarsOnSale, isCalendarSku } = require('../config/products');

function calendarsCurrentlyOnSale(now) {
  if (process.env.EADVENT_CALENDARS_ON_SALE === '1') return true;
  if (process.env.EADVENT_CALENDARS_ON_SALE === '0') return false;
  return isCalendarsOnSale(now);
}

function calendarSaleClosedMessage() {
  return 'Kalendarze adwentowe nie są teraz dostępne w sprzedaży.';
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

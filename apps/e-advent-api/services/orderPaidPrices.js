'use strict';

const { paidItemPrices, roundPln } = require('../config/products');

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value) || {}; } catch { return {}; }
  }
  return typeof value === 'object' ? value : {};
}

function discountFromOrder(order) {
  return parseMetadata(order?.metadata).discount || null;
}

function paidProductTotal(order) {
  return roundPln(Number(order.amount) - Number(order.shippingAmount ?? order.shipping_amount ?? 0));
}

function withPaidItemList(items, order) {
  return paidItemPrices(items || [], discountFromOrder(order), paidProductTotal(order));
}

function withPaidItemPrices(order) {
  if (!order) return order;
  const items = withPaidItemList(order.items || [], order);
  return items === order.items ? order : { ...order, items };
}

module.exports = { withPaidItemPrices, withPaidItemList, discountFromOrder };

'use strict';

const { query } = require('../config/database');
const { formatOrderNumber } = require('../utils/orderNumber');

const WARSAW = 'Europe/Warsaw';
const LIST_LIMIT = 40;
const SHIP_AFTER_MS = 4 * 24 * 60 * 60 * 1000;

function warsawClock(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WARSAW,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const num = (type) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: num('year'),
    month: num('month'),
    day: num('day'),
    hour: num('hour'),
    minute: num('minute'),
    second: num('second'),
  };
}

/** UTC instant of 00:00 Europe/Warsaw on the given calendar date. */
function zonedMidnightUtc(year, month, day) {
  let utc = Date.UTC(year, month - 1, day, 0, 0, 0);
  const target = utc;
  for (let i = 0; i < 4; i += 1) {
    const clock = warsawClock(new Date(utc));
    const clockAsUtc = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute, clock.second);
    const delta = target - clockAsUtc;
    if (delta === 0) return new Date(utc);
    utc += delta;
  }
  return new Date(utc);
}

function addCalendarDays(year, month, day, days) {
  const cursor = new Date(Date.UTC(year, month - 1, day));
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return {
    year: cursor.getUTCFullYear(),
    month: cursor.getUTCMonth() + 1,
    day: cursor.getUTCDate(),
  };
}

/**
 * Christmas season labeled by the year of Advent.
 * January still belongs to the previous season (fulfillment). February opens the next one.
 * Window: 1 Jan of the season year through 1 Feb of the next year (Warsaw).
 */
function currentSeason(now = new Date()) {
  const today = warsawClock(now);
  const year = today.month === 1 ? today.year - 1 : today.year;
  const from = zonedMidnightUtc(year, 1, 1);
  const to = zonedMidnightUtc(year + 1, 2, 1);
  return {
    year,
    label: `Sezon ${year}`,
    from,
    to,
  };
}

function warsawTodayRange(now = new Date()) {
  const today = warsawClock(now);
  const from = zonedMidnightUtc(today.year, today.month, today.day);
  const next = addCalendarDays(today.year, today.month, today.day, 1);
  const to = zonedMidnightUtc(next.year, next.month, next.day);
  return { from, to };
}

function mysqlUtc(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

const LIST_SQL = `
  SELECT
    o.id, o.order_number, o.created_at, o.updated_at, o.status, o.fulfillment_status,
    o.product_type, o.sku, o.amount, o.shipping_amount,
    o.amount_netto, o.vat_amount, o.shipping_netto, o.shipping_vat, o.vat_rate,
    o.currency, o.customer_email, o.customer_name, o.customer_phone,
    o.delivery_type, o.shipping_city, o.tracking_number,
    o.inpost_shipment_id, o.inpost_status, o.shipped_at, o.delivered_at, o.calendar_id,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
    (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS items_quantity
  FROM orders o
`;

function mapListRow(row) {
  return {
    ...row,
    order_number: row.order_number != null ? Number(row.order_number) : null,
    order_number_display: formatOrderNumber(row.order_number),
    amount: row.amount != null ? Number(row.amount) : 0,
  };
}

async function listWhere(whereSql, vals, orderSql) {
  const [rows] = await query(
    `${LIST_SQL} WHERE ${whereSql} ORDER BY ${orderSql} LIMIT ?`,
    [...vals, LIST_LIMIT],
  );
  return rows.map(mapListRow);
}

async function loadAdminDashboard(now = new Date()) {
  const season = currentSeason(now);
  const today = warsawTodayRange(now);
  const shipBefore = new Date(now.getTime() - SHIP_AFTER_MS);
  const seasonFrom = mysqlUtc(season.from);
  const seasonTo = mysqlUtc(season.to);
  const todayFrom = mysqlUtc(today.from);
  const todayTo = mysqlUtc(today.to);
  const shipCutoff = mysqlUtc(shipBefore);

  const [todayCountRows] = await query(
    'SELECT COUNT(*) AS total FROM orders WHERE created_at >= ? AND created_at < ?',
    [todayFrom, todayTo],
  );

  const [summaryRows] = await query(
    `SELECT
       COUNT(*) AS orders_total,
       SUM(status <> 'canceled') AS active_orders,
       SUM(status = 'succeeded') AS paid_orders,
       COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) AS paid_amount,
       SUM(status = 'canceled') AS canceled_orders,
       SUM(status = 'pending') AS pending_orders,
       SUM(status = 'succeeded' AND fulfillment_status = 'pending') AS to_fulfill,
       SUM(
         status = 'succeeded'
         AND fulfillment_status IN ('pending', 'processing')
         AND created_at <= ?
       ) AS to_ship
     FROM orders
     WHERE created_at >= ? AND created_at < ?`,
    [shipCutoff, seasonFrom, seasonTo],
  );
  const summary = summaryRows[0] || {};
  const paidOrders = Number(summary.paid_orders || 0);
  const paidAmount = Number(summary.paid_amount || 0);

  const [todayOrders, toFulfill, toShip] = await Promise.all([
    listWhere(
      'o.created_at >= ? AND o.created_at < ?',
      [todayFrom, todayTo],
      'o.created_at DESC',
    ),
    listWhere(
      `o.created_at >= ? AND o.created_at < ? AND o.status = 'succeeded' AND o.fulfillment_status = 'pending'`,
      [seasonFrom, seasonTo],
      'o.created_at ASC',
    ),
    listWhere(
      `o.created_at >= ? AND o.created_at < ?
       AND o.status = 'succeeded'
       AND o.fulfillment_status IN ('pending', 'processing')
       AND o.created_at <= ?`,
      [seasonFrom, seasonTo, shipCutoff],
      'o.created_at ASC',
    ),
  ]);

  return {
    season: {
      year: season.year,
      label: season.label,
      from: season.from.toISOString(),
      to: season.to.toISOString(),
    },
    summary: {
      orders: Number(summary.active_orders || 0),
      ordersTotal: Number(summary.orders_total || 0),
      paidOrders,
      paidAmount,
      averagePaid: paidOrders ? Math.round((paidAmount / paidOrders) * 100) / 100 : 0,
      canceledOrders: Number(summary.canceled_orders || 0),
      pendingOrders: Number(summary.pending_orders || 0),
      toFulfill: Number(summary.to_fulfill || 0),
      toShip: Number(summary.to_ship || 0),
      todayOrders: Number(todayCountRows[0]?.total || 0),
      currency: 'PLN',
    },
    today: todayOrders,
    toFulfill,
    toShip,
    listLimit: LIST_LIMIT,
  };
}

module.exports = {
  currentSeason,
  warsawTodayRange,
  loadAdminDashboard,
  SHIP_AFTER_MS,
};

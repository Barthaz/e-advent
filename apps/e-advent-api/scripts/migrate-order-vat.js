/**
 * Dodaje kolumny netto / VAT / brutto do orders i order_items.
 * Backfill z istniejących kwot brutto (stawka 23%).
 *
 * Uruchom:
 *   node scripts/migrate-order-vat.js           # obie bazy (prod + test)
 *   node scripts/migrate-order-vat.js --prod
 *   node scripts/migrate-order-vat.js --test
 *   npm run migrate:order-vat
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { DEFAULT_VAT_RATE, splitGrossAmount, roundPln } = require('../config/products');

function sharedHost() {
  return {
    host: process.env.MYSQL_HOST || 'h34.seohost.pl',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  };
}

function prodConfig() {
  return {
    ...sharedHost(),
    database: process.env.MYSQL_DATABASE || 'srv74754_e-advent',
    user: process.env.MYSQL_USER || 'srv74754_e-advent',
    password: process.env.MYSQL_PASSWORD || '',
  };
}

function testConfig() {
  return {
    ...sharedHost(),
    database: process.env.MYSQL_TEST_DATABASE || process.env.MYSQL_DATABASE || 'srv74754_e-advent-test',
    user: process.env.MYSQL_TEST_USER || process.env.MYSQL_USER || 'srv74754_e-advent-test',
    password: process.env.MYSQL_TEST_PASSWORD || process.env.MYSQL_PASSWORD || '',
  };
}

function selectedTargets() {
  const args = process.argv.slice(2);
  const wantProd = args.includes('--prod');
  const wantTest = args.includes('--test');
  if (wantProd || wantTest) {
    const targets = [];
    if (wantProd) targets.push({ label: 'prod', config: prodConfig() });
    if (wantTest) targets.push({ label: 'test', config: testConfig() });
    return targets;
  }
  return [
    { label: 'prod', config: prodConfig() },
    { label: 'test', config: testConfig() },
  ];
}

async function columnExists(conn, database, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [database, table, column]
  );
  return rows[0].cnt > 0;
}

async function tableExists(conn, database, table) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [database, table]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(conn, database, label, table, column, ddl) {
  if (await columnExists(conn, database, table, column)) {
    console.log(`[${label}] ${table}.${column} already exists`);
    return false;
  }
  await conn.execute(ddl);
  console.log(`[${label}] Added ${table}.${column}`);
  return true;
}

async function ensureOrderItemsTable(conn, database, label) {
  if (await tableExists(conn, database, 'order_items')) {
    console.log(`[${label}] order_items already exists`);
    return;
  }
  console.log(`[${label}] Creating order_items…`);
  await conn.query(`
    CREATE TABLE order_items (
      id                VARCHAR(36)   NOT NULL,
      order_id          VARCHAR(36)   NOT NULL,
      sku               VARCHAR(50)   NOT NULL,
      product_type      VARCHAR(50)   NOT NULL,
      quantity          INT           NOT NULL DEFAULT 1,
      unit_price        DECIMAL(10,2) NOT NULL,
      vat_rate          DECIMAL(5,2)  NOT NULL DEFAULT 23.00,
      unit_price_netto  DECIMAL(10,2) NOT NULL DEFAULT 0,
      line_netto        DECIMAL(10,2) NOT NULL DEFAULT 0,
      line_vat          DECIMAL(10,2) NOT NULL DEFAULT 0,
      line_brutto       DECIMAL(10,2) NOT NULL DEFAULT 0,
      calendar_id       VARCHAR(36)   NULL,
      metadata          JSON          NULL,
      created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_oi_order (order_id),
      INDEX idx_oi_calendar (calendar_id),
      CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_oi_calendar FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log(`[${label}] order_items created`);

  // Backfill one line per existing order (unit_price = amount − shipping when possible)
  const { v4: uuidv4 } = require('uuid');
  const { getProduct } = require('../config/products');
  const [orders] = await conn.execute(
    `SELECT id, calendar_id, sku, product_type, amount, shipping_amount
     FROM orders`
  );
  console.log(`[${label}] Backfilling ${orders.length} orders into order_items…`);
  for (const order of orders) {
    const sku = order.sku || 'interactive';
    const product = getProduct(sku);
    const productType = order.product_type || product?.type || 'interactive';
    const shipping = Number(order.shipping_amount) || 0;
    const amount = Number(order.amount) || 0;
    const unitPrice = product
      ? product.basePrice
      : roundPln(Math.max(0, amount - shipping));
    await conn.execute(
      `INSERT INTO order_items
         (id, order_id, sku, product_type, quantity, unit_price, calendar_id)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [uuidv4(), order.id, sku, productType, unitPrice, order.calendar_id || null]
    );
  }
}

async function migrateOne({ label, config }) {
  console.log(`\n[${label}] ${config.user}@${config.host}:${config.port}/${config.database}`);
  const conn = await mysql.createConnection(config);
  try {
    // Wymagane przez dalsze kolumny / backfill (starsze bazy mogły nie mieć shipping_amount)
    await addColumnIfMissing(
      conn,
      config.database,
      label,
      'orders',
      'shipping_amount',
      `ALTER TABLE orders
       ADD COLUMN shipping_amount DECIMAL(10,2) NOT NULL DEFAULT 0
         AFTER amount`
    );

    const afterShipping = (await columnExists(conn, config.database, 'orders', 'shipping_amount'))
      ? 'AFTER shipping_amount'
      : 'AFTER amount';

    await addColumnIfMissing(
      conn,
      config.database,
      label,
      'orders',
      'amount_netto',
      `ALTER TABLE orders
       ADD COLUMN amount_netto DECIMAL(10,2) NOT NULL DEFAULT 0
         COMMENT 'Suma netto (produkty + wysyłka)'
         ${afterShipping}`
    );
    await addColumnIfMissing(
      conn,
      config.database,
      label,
      'orders',
      'vat_amount',
      `ALTER TABLE orders
       ADD COLUMN vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0
         COMMENT 'Suma VAT (produkty + wysyłka)'
         AFTER amount_netto`
    );
    await addColumnIfMissing(
      conn,
      config.database,
      label,
      'orders',
      'shipping_netto',
      `ALTER TABLE orders
       ADD COLUMN shipping_netto DECIMAL(10,2) NOT NULL DEFAULT 0
         AFTER vat_amount`
    );
    await addColumnIfMissing(
      conn,
      config.database,
      label,
      'orders',
      'shipping_vat',
      `ALTER TABLE orders
       ADD COLUMN shipping_vat DECIMAL(10,2) NOT NULL DEFAULT 0
         AFTER shipping_netto`
    );
    await addColumnIfMissing(
      conn,
      config.database,
      label,
      'orders',
      'vat_rate',
      `ALTER TABLE orders
       ADD COLUMN vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00
         COMMENT 'Stawka VAT % obowiązująca przy zamówieniu'
         AFTER shipping_vat`
    );

    await ensureOrderItemsTable(conn, config.database, label);

    await addColumnIfMissing(
      conn,
      config.database,
      label,
      'order_items',
      'vat_rate',
      `ALTER TABLE order_items
       ADD COLUMN vat_rate DECIMAL(5,2) NOT NULL DEFAULT 23.00
         AFTER unit_price`
    );
    await addColumnIfMissing(
      conn,
      config.database,
      label,
      'order_items',
      'unit_price_netto',
      `ALTER TABLE order_items
       ADD COLUMN unit_price_netto DECIMAL(10,2) NOT NULL DEFAULT 0
         AFTER vat_rate`
    );
    await addColumnIfMissing(
      conn,
      config.database,
      label,
      'order_items',
      'line_netto',
      `ALTER TABLE order_items
       ADD COLUMN line_netto DECIMAL(10,2) NOT NULL DEFAULT 0
         AFTER unit_price_netto`
    );
    await addColumnIfMissing(
      conn,
      config.database,
      label,
      'order_items',
      'line_vat',
      `ALTER TABLE order_items
       ADD COLUMN line_vat DECIMAL(10,2) NOT NULL DEFAULT 0
         AFTER line_netto`
    );
    await addColumnIfMissing(
      conn,
      config.database,
      label,
      'order_items',
      'line_brutto',
      `ALTER TABLE order_items
       ADD COLUMN line_brutto DECIMAL(10,2) NOT NULL DEFAULT 0
         AFTER line_vat`
    );

    // Backfill order_items from unit_price (brutto)
    const [items] = await conn.execute(
      `SELECT id, quantity, unit_price, line_brutto
       FROM order_items
       WHERE line_brutto = 0 OR unit_price_netto = 0`
    );
    console.log(`[${label}] Backfilling ${items.length} order_items…`);
    for (const item of items) {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitBrutto = Number(item.unit_price) || 0;
      const lineBrutto = roundPln(unitBrutto * qty);
      const unitSplit = splitGrossAmount(unitBrutto, DEFAULT_VAT_RATE);
      const lineSplit = splitGrossAmount(lineBrutto, DEFAULT_VAT_RATE);
      await conn.execute(
        `UPDATE order_items
         SET vat_rate = ?, unit_price_netto = ?, line_netto = ?, line_vat = ?, line_brutto = ?
         WHERE id = ?`,
        [
          DEFAULT_VAT_RATE,
          unitSplit.netto,
          lineSplit.netto,
          lineSplit.vat,
          lineSplit.brutto,
          item.id,
        ]
      );
    }

    // Backfill orders from amount / shipping_amount + sum of items when available
    const [orders] = await conn.execute(
      `SELECT id, amount, shipping_amount, amount_netto, vat_amount
       FROM orders
       WHERE amount_netto = 0 AND vat_amount = 0 AND amount > 0`
    );
    console.log(`[${label}] Backfilling ${orders.length} orders…`);
    for (const order of orders) {
      const shippingBrutto = Number(order.shipping_amount) || 0;
      const shippingSplit = splitGrossAmount(shippingBrutto, DEFAULT_VAT_RATE);

      const [itemSums] = await conn.execute(
        `SELECT
           COALESCE(SUM(line_netto), 0) AS products_netto,
           COALESCE(SUM(line_vat), 0) AS products_vat,
           COALESCE(SUM(line_brutto), 0) AS products_brutto
         FROM order_items WHERE order_id = ?`,
        [order.id]
      );
      const productsNetto = Number(itemSums[0].products_netto) || 0;
      const productsVat = Number(itemSums[0].products_vat) || 0;
      const productsBrutto = Number(itemSums[0].products_brutto) || 0;

      let amountNetto;
      let vatAmount;
      if (productsBrutto > 0) {
        amountNetto = roundPln(productsNetto + shippingSplit.netto);
        vatAmount = roundPln(productsVat + shippingSplit.vat);
      } else {
        const totalSplit = splitGrossAmount(Number(order.amount) || 0, DEFAULT_VAT_RATE);
        amountNetto = totalSplit.netto;
        vatAmount = totalSplit.vat;
      }

      await conn.execute(
        `UPDATE orders
         SET amount_netto = ?, vat_amount = ?, shipping_netto = ?, shipping_vat = ?, vat_rate = ?
         WHERE id = ?`,
        [
          amountNetto,
          vatAmount,
          shippingSplit.netto,
          shippingSplit.vat,
          DEFAULT_VAT_RATE,
          order.id,
        ]
      );
    }

    console.log(`[${label}] Done.`);
  } finally {
    await conn.end();
  }
}

async function main() {
  const targets = selectedTargets();
  for (const target of targets) {
    await migrateOne(target);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

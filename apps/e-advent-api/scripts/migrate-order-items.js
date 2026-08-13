/**
 * scripts/migrate-order-items.js
 * - Creates order_items table
 * - Makes orders.calendar_id nullable
 * - Adds shipping_amount column
 * - Backfills one order_item per existing order
 *
 * Run: node scripts/migrate-order-items.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getMysqlConfig } = require('../config/app');

const config = {
  ...getMysqlConfig(),
  multipleStatements: true,
};

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [config.database, table, column]
  );
  return rows[0].cnt > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [config.database, table]
  );
  return rows[0].cnt > 0;
}

async function main() {
  let conn;
  try {
    console.log('Connecting to MySQL...');
    conn = await mysql.createConnection(config);
    console.log('Connected.');

    if (!(await tableExists(conn, 'order_items'))) {
      console.log('Creating order_items...');
      await conn.query(`
        CREATE TABLE order_items (
          id            VARCHAR(36)   NOT NULL,
          order_id      VARCHAR(36)   NOT NULL,
          sku           VARCHAR(50)   NOT NULL,
          product_type  VARCHAR(50)   NOT NULL,
          quantity      INT           NOT NULL DEFAULT 1,
          unit_price    DECIMAL(10,2) NOT NULL,
          calendar_id   VARCHAR(36)   NULL,
          metadata      JSON          NULL,
          created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_oi_order (order_id),
          INDEX idx_oi_calendar (calendar_id),
          CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          CONSTRAINT fk_oi_calendar FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('order_items created.');
    } else {
      console.log('order_items already exists.');
    }

    if (!(await columnExists(conn, 'orders', 'shipping_amount'))) {
      console.log('Adding orders.shipping_amount...');
      await conn.query(
        `ALTER TABLE orders ADD COLUMN shipping_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER amount`
      );
    }

    // Drop FK, alter calendar_id nullable, re-add FK
    console.log('Making orders.calendar_id nullable...');
    try {
      await conn.query('ALTER TABLE orders DROP FOREIGN KEY fk_ord_calendar');
    } catch (e) {
      console.log('FK drop skipped:', e.message);
    }
    await conn.query('ALTER TABLE orders MODIFY calendar_id VARCHAR(36) NULL');
    try {
      await conn.query(`
        ALTER TABLE orders
        ADD CONSTRAINT fk_ord_calendar
        FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE RESTRICT
      `);
    } catch (e) {
      console.log('FK re-add skipped:', e.message);
    }

    // Backfill order_items from orders that have no items yet
    const [orders] = await conn.execute(
      `SELECT o.id, o.calendar_id, o.sku, o.product_type, o.amount, o.shipping_amount
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE oi.id IS NULL`
    );

    console.log(`Backfilling ${orders.length} orders into order_items...`);
    const { v4: uuidv4 } = require('uuid');
    const { getProduct, computeOrderTotals } = require('../config/products');

    for (const order of orders) {
      const sku = order.sku || 'interactive';
      const product = getProduct(sku);
      const productType = order.product_type || product?.type || 'interactive';
      const unitPrice = product ? product.basePrice : Number(order.amount) || 0;
      const totals = computeOrderTotals([{ sku, quantity: 1 }]);
      const shipping = totals ? totals.shipping : 0;

      await conn.execute(
        `INSERT INTO order_items (id, order_id, sku, product_type, quantity, unit_price, calendar_id)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [uuidv4(), order.id, sku, productType, unitPrice, order.calendar_id || null]
      );

      await conn.execute(
        `UPDATE orders SET shipping_amount = ? WHERE id = ?`,
        [shipping, order.id]
      );
    }

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();

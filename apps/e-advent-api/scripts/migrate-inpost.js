// Run explicitly against ONE target. Never default to a production connection.
require('dotenv').config();
const mysql = require('mysql2/promise');

const ORDER_COLUMNS = [
  ['inpost_shipment_id', 'VARCHAR(30) NULL AFTER tracking_number'],
  ['inpost_status', 'VARCHAR(50) NULL AFTER inpost_shipment_id'],
  ['label_created_at', 'DATETIME NULL AFTER inpost_status'],
  ['shipped_at', 'DATETIME NULL AFTER label_created_at'],
  ['delivered_at', 'DATETIME NULL AFTER shipped_at'],
  ['shipping_building_number', 'VARCHAR(30) NULL AFTER shipping_street'],
  ['shipping_apartment_number', 'VARCHAR(30) NULL AFTER shipping_building_number'],
  ['shipping_country', "CHAR(2) NULL AFTER shipping_postal_code"],
];
const SHIPMENT_COLUMNS = [
  ['label_downloaded_at', 'DATETIME NULL AFTER remote'],
];

async function columns(conn, table) {
  const [rows] = await conn.execute(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);
  return new Set(rows.map(r => r.COLUMN_NAME));
}
async function addColumns(conn, table, list) {
  const existing = await columns(conn, table);
  for (const [name, definition] of list) {
    if (!existing.has(name)) await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}
async function addIndex(conn, table, name, definition) {
  const [rows] = await conn.execute(
    'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1', [table, name]);
  if (!rows.length) await conn.execute(`ALTER TABLE ${table} ADD INDEX ${name} ${definition}`);
}

async function migrate(conn) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS order_inpost_shipments (
    order_id VARCHAR(36) NOT NULL PRIMARY KEY,
    environment VARCHAR(12) NOT NULL,
    organization_id VARCHAR(30) NOT NULL,
    shipment_id VARCHAR(30) NULL,
    state VARCHAR(30) NOT NULL,
    buy_attempted TINYINT NOT NULL DEFAULT 0,
    payload JSON NOT NULL,
    remote JSON NULL,
    label_downloaded_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_inpost_shipment (environment, organization_id, shipment_id),
    CONSTRAINT fk_inpost_order FOREIGN KEY (order_id) REFERENCES orders(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await addColumns(conn, 'order_inpost_shipments', SHIPMENT_COLUMNS);
  await addColumns(conn, 'orders', ORDER_COLUMNS);
  await addIndex(conn, 'orders', 'idx_ord_inpost_shipment', '(inpost_shipment_id)');
  await addIndex(conn, 'orders', 'idx_ord_fulfillment', '(fulfillment_status)');

  // Backfill only empty columns; never overwrite prices, numbers or addresses.
  await conn.execute(`UPDATE orders o JOIN order_inpost_shipments s ON s.order_id = o.id
    SET o.inpost_shipment_id = s.shipment_id,
        o.inpost_status = COALESCE(o.inpost_status, JSON_UNQUOTE(JSON_EXTRACT(s.remote, '$.status')))
    WHERE o.inpost_shipment_id IS NULL AND s.shipment_id IS NOT NULL`);
  await conn.execute(`UPDATE orders SET
      shipping_building_number = JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.inpostDelivery.receiver.address.building_number')),
      shipping_apartment_number = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.inpostDelivery.receiver.address.flat_number')), 'null'),
      shipping_country = 'PL'
    WHERE shipping_building_number IS NULL
      AND JSON_EXTRACT(metadata, '$.inpostDelivery.receiver.address.building_number') IS NOT NULL`);
  await conn.execute(`UPDATE orders SET shipping_country = 'PL'
    WHERE shipping_country IS NULL AND JSON_EXTRACT(metadata, '$.inpostDelivery') IS NOT NULL`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--test', '--prod'].includes(args[0])) throw new Error('Wybierz dokładnie jedną bazę: --test lub --prod');
  const prefix = args[0] === '--test' ? 'MYSQL_TEST_' : 'MYSQL_';
  const host = process.env[prefix + 'HOST'] || process.env.MYSQL_HOST;
  for (const key of ['DATABASE', 'USER', 'PASSWORD']) {
    if (!process.env[prefix + key]) throw new Error(`Missing ${prefix + key}`);
  }
  if (!host) throw new Error(`Missing ${prefix}HOST`);
  const conn = await mysql.createConnection({
    host, port: Number(process.env[prefix + 'PORT'] || process.env.MYSQL_PORT || 3306),
    database: process.env[prefix + 'DATABASE'], user: process.env[prefix + 'USER'], password: process.env[prefix + 'PASSWORD'],
  });
  try { await migrate(conn); console.log(`InPost schema ready on ${process.env[prefix + 'DATABASE']}; existing order numbers, prices and UUIDs unchanged.`); }
  finally { await conn.end(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };

/**
 * Dodaje orders.order_number (kolejny, unikalny numer od 1)
 * i nadaje numery istniejącym zamówieniom chronologicznie (000001, 000002, …).
 *
 * Bezpieczne przy ponownym uruchomieniu.
 *
 * Uruchom:
 *   node scripts/migrate-order-number.js           # obie bazy (prod + test)
 *   node scripts/migrate-order-number.js --prod
 *   node scripts/migrate-order-number.js --test
 *   npm run migrate:order-number
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

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

async function indexExists(conn, database, table, indexName) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [database, table, indexName]
  );
  return rows[0].cnt > 0;
}

async function migrateOne({ label, config }) {
  console.log(`\n[${label}] ${config.user}@${config.host}:${config.port}/${config.database}`);
  const conn = await mysql.createConnection(config);
  try {
    const hasColumn = await columnExists(conn, config.database, 'orders', 'order_number');

    if (!hasColumn) {
      await conn.execute(
        `ALTER TABLE orders
         ADD COLUMN order_number INT UNSIGNED NULL
           COMMENT 'Publiczny numer zamówienia (1 → 000001)'
           AFTER id`
      );
      console.log(`[${label}] Added orders.order_number`);
    } else {
      console.log(`[${label}] orders.order_number already exists`);
    }

    const [missing] = await conn.execute(
      `SELECT id FROM orders WHERE order_number IS NULL ORDER BY created_at ASC, id ASC`
    );

    if (missing.length > 0) {
      const [maxRows] = await conn.execute(
        'SELECT COALESCE(MAX(order_number), 0) AS max_n FROM orders'
      );
      let next = Number(maxRows[0].max_n) || 0;

      for (const row of missing) {
        next += 1;
        await conn.execute(
          'UPDATE orders SET order_number = ? WHERE id = ? AND order_number IS NULL',
          [next, row.id]
        );
      }
      console.log(`[${label}] Backfilled ${missing.length} order number(s) (up to ${next})`);
    } else {
      console.log(`[${label}] No orders need order_number backfill`);
    }

    if (!(await indexExists(conn, config.database, 'orders', 'uq_order_number'))) {
      await conn.execute(
        'ALTER TABLE orders ADD UNIQUE KEY uq_order_number (order_number)'
      );
      console.log(`[${label}] Added UNIQUE KEY uq_order_number`);
    } else {
      console.log(`[${label}] UNIQUE KEY uq_order_number already exists`);
    }

    // AUTO_INCREMENT na kolumnie UNIQUE (PK pozostaje UUID)
    const [colInfo] = await conn.execute(
      `SELECT EXTRA, IS_NULLABLE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'order_number'`,
      [config.database]
    );
    const extra = (colInfo[0] && colInfo[0].EXTRA) || '';
    const nullable = colInfo[0] && colInfo[0].IS_NULLABLE === 'YES';

    if (!String(extra).includes('auto_increment') || nullable) {
      await conn.execute(
        `ALTER TABLE orders
         MODIFY COLUMN order_number INT UNSIGNED NOT NULL AUTO_INCREMENT
           COMMENT 'Publiczny numer zamówienia (1 → 000001)'`
      );
      console.log(`[${label}] Set order_number NOT NULL AUTO_INCREMENT`);
    } else {
      console.log(`[${label}] order_number already AUTO_INCREMENT NOT NULL`);
    }

    const [maxAfter] = await conn.execute(
      'SELECT COALESCE(MAX(order_number), 0) AS max_n FROM orders'
    );
    console.log(`[${label}] Highest order_number: ${maxAfter[0].max_n}`);
  } finally {
    await conn.end();
  }
}

async function main() {
  const targets = selectedTargets();
  for (const target of targets) {
    await migrateOne(target);
  }
  console.log('\nOrder number migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

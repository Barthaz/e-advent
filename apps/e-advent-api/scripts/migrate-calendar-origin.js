/**
 * Dodaje kolumnę origin do calendars (store | generator).
 * Bezpieczne przy ponownym uruchomieniu.
 *
 * Uruchom:
 *   node scripts/migrate-calendar-origin.js           # obie bazy (prod + test)
 *   node scripts/migrate-calendar-origin.js --prod
 *   node scripts/migrate-calendar-origin.js --test
 *   npm run migrate:calendar-origin
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
    [database, table, column],
  );
  return rows[0].cnt > 0;
}

async function indexExists(conn, database, table, indexName) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [database, table, indexName],
  );
  return rows[0].cnt > 0;
}

async function migrateOne({ label, config }) {
  console.log(`\n[${label}] ${config.user}@${config.host}:${config.port}/${config.database}`);
  const conn = await mysql.createConnection(config);
  try {
    if (!(await columnExists(conn, config.database, 'calendars', 'origin'))) {
      await conn.execute(
        `ALTER TABLE calendars
         ADD COLUMN origin VARCHAR(20) NOT NULL DEFAULT 'store'
           COMMENT 'store = checkout / shop; generator = admin panel'
           AFTER daily_content_email`,
      );
      console.log(`[${label}] Added calendars.origin`);
    } else {
      console.log(`[${label}] calendars.origin already exists`);
    }

    if (!(await indexExists(conn, config.database, 'calendars', 'idx_cal_origin'))) {
      await conn.execute('CREATE INDEX idx_cal_origin ON calendars (origin)');
      console.log(`[${label}] Added calendars.idx_cal_origin`);
    } else {
      console.log(`[${label}] calendars.idx_cal_origin already exists`);
    }
  } finally {
    await conn.end();
  }
}

async function main() {
  const targets = selectedTargets();
  for (const target of targets) {
    await migrateOne(target);
  }
  console.log('\nCalendar origin migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

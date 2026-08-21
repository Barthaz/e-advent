/**
 * Dodaje kolumny opening_method i daily_content_email do calendars.
 * Bezpieczne przy ponownym uruchomieniu.
 *
 * Uruchom:
 *   node scripts/migrate-opening-method.js           # obie bazy (prod + test)
 *   node scripts/migrate-opening-method.js --prod
 *   node scripts/migrate-opening-method.js --test
 *   npm run migrate:opening-method
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

async function migrateOne({ label, config }) {
  console.log(`\n[${label}] ${config.user}@${config.host}:${config.port}/${config.database}`);
  const conn = await mysql.createConnection(config);
  try {
    if (!(await columnExists(conn, config.database, 'calendars', 'opening_method'))) {
      await conn.execute(
        `ALTER TABLE calendars
         ADD COLUMN opening_method VARCHAR(20) NULL
           COMMENT 'app | email | online'
           AFTER fulfillment_notes`
      );
      console.log(`[${label}] Added calendars.opening_method`);
    } else {
      console.log(`[${label}] calendars.opening_method already exists`);
    }

    if (!(await columnExists(conn, config.database, 'calendars', 'daily_content_email'))) {
      await conn.execute(
        `ALTER TABLE calendars
         ADD COLUMN daily_content_email VARCHAR(255) NULL
           COMMENT 'Inbox for daily window content (email opening method)'
           AFTER opening_method`
      );
      console.log(`[${label}] Added calendars.daily_content_email`);
    } else {
      console.log(`[${label}] calendars.daily_content_email already exists`);
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
  console.log('\nOpening method migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

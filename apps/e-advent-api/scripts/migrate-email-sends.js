/**
 * Tworzy tabelę email_sends (log wysyłek) na wybranej bazie.
 * Bezpieczne przy ponownym uruchomieniu.
 *
 * Uruchom:
 *   node scripts/migrate-email-sends.js           # obie bazy (prod + test)
 *   node scripts/migrate-email-sends.js --prod
 *   node scripts/migrate-email-sends.js --test
 *   npm run migrate:email-sends
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DDL = `
  CREATE TABLE email_sends (
    id               VARCHAR(36)   NOT NULL,
    type             VARCHAR(40)   NOT NULL COMMENT 'order_confirmation | interactive_access | shipping | daily_window | collaboration_invite',
    order_id         VARCHAR(36)   NULL,
    calendar_id      VARCHAR(36)   NULL,
    day              TINYINT       NULL,
    recipient_email  VARCHAR(255)  NOT NULL,
    subject          VARCHAR(255)  NOT NULL DEFAULT '',
    status           VARCHAR(20)   NOT NULL DEFAULT 'sent' COMMENT 'sent | failed',
    error_message    TEXT          NULL,
    triggered_by     VARCHAR(20)   NOT NULL DEFAULT 'system' COMMENT 'webhook | admin | cron | system',
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_es_order (order_id),
    INDEX idx_es_calendar (calendar_id),
    INDEX idx_es_daily (calendar_id, day, type, status),
    INDEX idx_es_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

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

async function tableExists(conn, database, table) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [database, table]
  );
  return rows[0].cnt > 0;
}

async function migrateOne({ label, config }) {
  console.log(`\n[${label}] ${config.user}@${config.host}:${config.port}/${config.database}`);
  const conn = await mysql.createConnection(config);
  try {
    if (await tableExists(conn, config.database, 'email_sends')) {
      console.log(`[${label}] email_sends already exists`);
      return;
    }
    await conn.execute(DDL);
    console.log(`[${label}] Created email_sends`);
  } finally {
    await conn.end();
  }
}

async function main() {
  const targets = selectedTargets();
  for (const target of targets) {
    await migrateOne(target);
  }
  console.log('\nemail_sends migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

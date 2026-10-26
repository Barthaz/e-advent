// Run explicitly against ONE target. Never default to a production connection.
require('dotenv').config();
const mysql = require('mysql2/promise');

async function hasColumn(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

async function migrate(conn) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS checkout_sessions (
    id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    order_id VARCHAR(36) NULL,
    payment_intent_id VARCHAR(255) NULL,
    fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_checkout_order (order_id),
    INDEX idx_checkout_intent (payment_intent_id),
    CONSTRAINT fk_checkout_order FOREIGN KEY (order_id) REFERENCES orders(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS order_email_jobs (
    order_id VARCHAR(36) NOT NULL PRIMARY KEY,
    status ENUM('pending','sent') NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    last_error VARCHAR(500) NULL,
    next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email_pending (status, next_attempt_at),
    CONSTRAINT fk_email_job_order FOREIGN KEY (order_id) REFERENCES orders(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const [fks] = await conn.execute(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'checkout_sessions'
       AND COLUMN_NAME = 'order_id' AND REFERENCED_TABLE_NAME = 'orders'`,
  );
  for (const fk of fks) {
    await conn.execute(`ALTER TABLE checkout_sessions DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
  }
  await conn.execute('ALTER TABLE checkout_sessions MODIFY order_id VARCHAR(36) NULL');
  if (!(await hasColumn(conn, 'checkout_sessions', 'payment_intent_id'))) {
    await conn.execute('ALTER TABLE checkout_sessions ADD COLUMN payment_intent_id VARCHAR(255) NULL');
  }
  if (!(await hasColumn(conn, 'checkout_sessions', 'fingerprint'))) {
    await conn.execute('ALTER TABLE checkout_sessions ADD COLUMN fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL');
  }
  const [intentIdx] = await conn.execute(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'checkout_sessions' AND INDEX_NAME = 'idx_checkout_intent' LIMIT 1`,
  );
  if (!intentIdx.length) {
    await conn.execute('ALTER TABLE checkout_sessions ADD INDEX idx_checkout_intent (payment_intent_id)');
  }
  const [fkNow] = await conn.execute(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'checkout_sessions'
       AND CONSTRAINT_NAME = 'fk_checkout_order' AND CONSTRAINT_TYPE = 'FOREIGN KEY' LIMIT 1`,
  );
  if (!fkNow.length) {
    await conn.execute('ALTER TABLE checkout_sessions ADD CONSTRAINT fk_checkout_order FOREIGN KEY (order_id) REFERENCES orders(id)');
  }
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
  try { await migrate(conn); console.log('Checkout tables ready; existing order UUIDs and numbers unchanged.'); }
  finally { await conn.end(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };

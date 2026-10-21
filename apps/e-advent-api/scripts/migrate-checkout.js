// Run explicitly against ONE target. Never default to a production connection.
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate(conn) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS checkout_sessions (
    id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_checkout_order (order_id),
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
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--test', '--prod'].includes(args[0])) throw new Error('Wybierz dokładnie jedną bazę: --test lub --prod');
  const prefix = args[0] === '--test' ? 'MYSQL_TEST_' : 'MYSQL_';
  for (const key of ['HOST', 'DATABASE', 'USER', 'PASSWORD']) {
    if (!process.env[prefix + key]) throw new Error(`Missing ${prefix + key}`);
  }
  const conn = await mysql.createConnection({
    host: process.env[prefix + 'HOST'], port: Number(process.env[prefix + 'PORT'] || 3306),
    database: process.env[prefix + 'DATABASE'], user: process.env[prefix + 'USER'], password: process.env[prefix + 'PASSWORD'],
  });
  try { await migrate(conn); console.log('Checkout tables ready; existing order UUIDs and numbers unchanged.'); }
  finally { await conn.end(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };

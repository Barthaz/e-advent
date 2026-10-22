require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate(conn) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS discount_codes (
    id CHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(24) NOT NULL,
    percent TINYINT NOT NULL,
    reusable TINYINT NOT NULL DEFAULT 0,
    active TINYINT NOT NULL DEFAULT 1,
    uses_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_discount_code (code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS discount_redemptions (
    id CHAR(36) NOT NULL PRIMARY KEY,
    code_id CHAR(36) NOT NULL,
    order_id VARCHAR(36) NULL,
    customer_email VARCHAR(255) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_disc_code (code_id),
    UNIQUE KEY uq_disc_order (order_id),
    CONSTRAINT fk_disc_code FOREIGN KEY (code_id) REFERENCES discount_codes(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [rabatIndex] = await conn.execute(
    "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_ord_rabat' LIMIT 1",
  );
  if (!rabatIndex.length) await conn.execute('ALTER TABLE orders ADD INDEX idx_ord_rabat (rabat_code)');
  const [orderUniq] = await conn.execute(
    "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'discount_redemptions' AND INDEX_NAME = 'uq_disc_order' LIMIT 1",
  );
  if (!orderUniq.length) await conn.execute('ALTER TABLE discount_redemptions ADD UNIQUE KEY uq_disc_order (order_id)');
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
  try {
    await migrate(conn);
    console.log(`Discount codes schema ready on ${process.env[prefix + 'DATABASE']}.`);
  } finally { await conn.end(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };

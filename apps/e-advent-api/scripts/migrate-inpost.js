// Run explicitly against ONE target. Never default to a production connection.
require('dotenv').config();
const mysql = require('mysql2/promise');

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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_inpost_shipment (environment, organization_id, shipment_id),
    CONSTRAINT fk_inpost_order FOREIGN KEY (order_id) REFERENCES orders(id)
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
  try { await migrate(conn); console.log('InPost shipment table ready; existing orders unchanged.'); }
  finally { await conn.end(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };

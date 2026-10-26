// Run explicitly against ONE target. Never default to a production connection.
require('dotenv').config();
const mysql = require('mysql2/promise');
const { warsawWallClockToUtc } = require('../utils/warsawTime');

const PATCH_ID = 'orders-datetime-utc-2026-10-26';
const COLUMNS = ['created_at', 'updated_at', 'label_created_at', 'shipped_at', 'delivered_at'];

function toMysqlUtc(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function migrate(conn) {
  await conn.execute(`CREATE TABLE IF NOT EXISTS schema_patches (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    applied_at DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [done] = await conn.execute('SELECT id FROM schema_patches WHERE id = ? LIMIT 1', [PATCH_ID]);
  if (done.length) return { skipped: true, updated: 0 };

  await conn.execute("SET time_zone = '+00:00'");
  const [rows] = await conn.execute(
    `SELECT id, ${COLUMNS.join(', ')} FROM orders`,
  );
  let updated = 0;
  for (const row of rows) {
    const patch = {};
    for (const column of COLUMNS) {
      if (!row[column]) continue;
      patch[column] = toMysqlUtc(warsawWallClockToUtc(row[column]));
    }
    const fields = Object.keys(patch);
    if (!fields.length) continue;
    await conn.execute(
      `UPDATE orders SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`,
      [...fields.map((field) => patch[field]), row.id],
    );
    updated += 1;
  }
  await conn.execute('INSERT INTO schema_patches (id, applied_at) VALUES (?, UTC_TIMESTAMP())', [PATCH_ID]);
  return { skipped: false, updated };
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
    host,
    port: Number(process.env[prefix + 'PORT'] || process.env.MYSQL_PORT || 3306),
    database: process.env[prefix + 'DATABASE'],
    user: process.env[prefix + 'USER'],
    password: process.env[prefix + 'PASSWORD'],
    timezone: '+00:00',
  });
  try {
    const result = await migrate(conn);
    console.log(result.skipped
      ? 'Order timestamps already converted to UTC.'
      : `Converted ${result.updated} order timestamp rows to UTC.`);
  } finally {
    await conn.end();
  }
}
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate };

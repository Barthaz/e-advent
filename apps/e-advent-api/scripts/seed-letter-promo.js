require('dotenv').config();
const { randomUUID } = require('node:crypto');
const mysql = require('mysql2/promise');
const { LETTER_PROMO_CODE, LETTER_PROMO_PERCENT } = require('../config/products');

async function seed(conn) {
  const code = LETTER_PROMO_CODE;
  const percent = LETTER_PROMO_PERCENT;
  const [rows] = await conn.execute('SELECT * FROM discount_codes WHERE code = ?', [code]);
  if (rows[0]) {
    await conn.execute(
      'UPDATE discount_codes SET percent = ?, reusable = 1, active = 1 WHERE id = ?',
      [percent, rows[0].id],
    );
    return {
      id: rows[0].id,
      code,
      percent,
      reusable: true,
      active: true,
      usesCount: Number(rows[0].uses_count || 0),
      updated: true,
    };
  }
  const id = randomUUID();
  await conn.execute(
    'INSERT INTO discount_codes (id, code, percent, reusable, active, uses_count) VALUES (?, ?, ?, ?, 1, 0)',
    [id, code, percent, 1],
  );
  return { id, code, percent, reusable: true, active: true, usesCount: 0, updated: false };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--test', '--prod'].includes(args[0])) {
    throw new Error('Wybierz dokładnie jedną bazę: --test lub --prod');
  }
  const prefix = args[0] === '--test' ? 'MYSQL_TEST_' : 'MYSQL_';
  const host = process.env[prefix + 'HOST'] || process.env.MYSQL_HOST;
  for (const key of ['DATABASE', 'USER', 'PASSWORD']) {
    if (!process.env[prefix + key]) throw new Error(`Missing ${prefix}${key}`);
  }
  if (!host) throw new Error(`Missing ${prefix}HOST`);
  const conn = await mysql.createConnection({
    host,
    port: Number(process.env[prefix + 'PORT'] || process.env.MYSQL_PORT || 3306),
    database: process.env[prefix + 'DATABASE'],
    user: process.env[prefix + 'USER'],
    password: process.env[prefix + 'PASSWORD'],
  });
  try {
    const result = await seed(conn);
    console.log(
      `Letter promo ${result.code} (${result.percent}%, reusable) ${result.updated ? 'updated' : 'created'} on ${process.env[prefix + 'DATABASE']}.`,
    );
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { seed };

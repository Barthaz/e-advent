/**
 * Dodaje kolumnę edit_token do calendars (bezpieczne przy ponownym uruchomieniu).
 * Uruchom: node scripts/migrate-security.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getMysqlConfig } = require('../config/app');

const config = getMysqlConfig();

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [config.database, table, column]
  );
  return rows[0].cnt > 0;
}

async function main() {
  const conn = await mysql.createConnection(config);
  try {
    if (!(await columnExists(conn, 'calendars', 'edit_token'))) {
      await conn.execute(
        `ALTER TABLE calendars
         ADD COLUMN edit_token VARCHAR(64) NULL AFTER access_code,
         ADD INDEX idx_cal_edit_token (edit_token)`
      );
      console.log('Added calendars.edit_token');
    } else {
      console.log('calendars.edit_token already exists');
    }
    console.log('Security migration complete.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

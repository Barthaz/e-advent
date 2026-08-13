/**
 * Jednorazowa migracja: opłacone (lub darmowe) kalendarze interaktywne
 * dostają fulfillment_status = 'delivered' — wysyłka e-mailem jest automatyczna.
 *
 * Zdrapki (scratch) pozostają bez zmian.
 *
 * Uruchom: node scripts/migrate-interactive-delivered.js
 *          npm run migrate:interactive-delivered
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getMysqlConfig } = require('../config/app');

const config = getMysqlConfig();

/** Typ produktu: scratch tylko gdy product_type/sku wskazują zdrapkę. */
const IS_INTERACTIVE = `
  COALESCE(
    NULLIF(product_type, ''),
    IF(IFNULL(sku, '') LIKE 'scratch%', 'scratch', 'interactive')
  ) = 'interactive'
`;

async function main() {
  const conn = await mysql.createConnection(config);
  try {
    const [orderPreview] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM orders
       WHERE status = 'succeeded'
         AND fulfillment_status <> 'delivered'
         AND ${IS_INTERACTIVE}`
    );
    const [calendarPreview] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM calendars
       WHERE status = 'succeeded'
         AND fulfillment_status <> 'delivered'
         AND ${IS_INTERACTIVE}`
    );

    console.log(`Orders to update:    ${orderPreview[0].cnt}`);
    console.log(`Calendars to update: ${calendarPreview[0].cnt}`);

    const [orderResult] = await conn.execute(
      `UPDATE orders
       SET fulfillment_status = 'delivered'
       WHERE status = 'succeeded'
         AND fulfillment_status <> 'delivered'
         AND ${IS_INTERACTIVE}`
    );

    const [calendarResult] = await conn.execute(
      `UPDATE calendars
       SET fulfillment_status = 'delivered'
       WHERE status = 'succeeded'
         AND fulfillment_status <> 'delivered'
         AND ${IS_INTERACTIVE}`
    );

    console.log(`Updated orders:    ${orderResult.affectedRows}`);
    console.log(`Updated calendars: ${calendarResult.affectedRows}`);
    console.log('Interactive delivered migration complete.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

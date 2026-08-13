/**
 * scripts/migrate.js
 * Tworzy tabele MySQL i opcjonalnie seeduje pierwszego admina.
 * Używa aktywnej bazy z TESTING_MODE (test lub prod).
 * Uruchom: node scripts/migrate.js [--seed-admin]
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { testingMode, getMysqlConfig } = require('../config/app');

const config = {
  ...getMysqlConfig(),
  multipleStatements: true,
};

const DDL = `
CREATE TABLE IF NOT EXISTS calendars (
  id                 VARCHAR(36)   NOT NULL,
  title              VARCHAR(255)  NULL,
  author             VARCHAR(255)  NULL,
  email              VARCHAR(255)  NOT NULL,
  product_type       VARCHAR(50)   NOT NULL DEFAULT 'interactive',
  sku                VARCHAR(50)   NOT NULL DEFAULT 'interactive',
  format             VARCHAR(10)   NULL,
  design_url         TEXT          NULL,
  tasks              JSON          NOT NULL,
  status             VARCHAR(20)   NOT NULL DEFAULT 'pending',
  access_code        VARCHAR(10)   NULL,
  edit_token         VARCHAR(64)   NULL,
  is_free            TINYINT(1)    NOT NULL DEFAULT 0,
  fulfillment_status VARCHAR(50)   NOT NULL DEFAULT 'pending',
  fulfillment_notes  TEXT          NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cal_email (email),
  INDEX idx_cal_status (status),
  INDEX idx_cal_created (created_at),
  INDEX idx_cal_edit_token (edit_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id                           VARCHAR(36)    NOT NULL,
  calendar_id                  VARCHAR(36)    NULL,
  stripe_payment_intent_id     VARCHAR(255)   NULL,
  amount                       DECIMAL(10,2)  NOT NULL DEFAULT 0,
  shipping_amount              DECIMAL(10,2)  NOT NULL DEFAULT 0,
  currency                     VARCHAR(10)    NOT NULL DEFAULT 'pln',
  status                       VARCHAR(20)    NOT NULL DEFAULT 'pending',
  customer_email               VARCHAR(255)   NOT NULL,
  customer_name                VARCHAR(255)   NULL,
  customer_phone               VARCHAR(50)    NULL,
  delivery_type                VARCHAR(30)    NULL COMMENT 'none | poczta_polska | courier_inpost | parcel_inpost',
  shipping_street              VARCHAR(255)   NULL,
  shipping_city                VARCHAR(100)   NULL,
  shipping_postal_code         VARCHAR(20)    NULL,
  parcel_locker_id             VARCHAR(50)    NULL,
  parcel_locker_name           VARCHAR(255)   NULL,
  parcel_locker_address        VARCHAR(255)   NULL,
  tracking_number              VARCHAR(100)   NULL,
  terms_accepted_at            DATETIME       NULL,
  privacy_policy_accepted_at   DATETIME       NULL,
  client_ip                    VARCHAR(45)    NULL,
  rabat_code                   VARCHAR(50)    NULL,
  product_type                 VARCHAR(50)    NULL,
  sku                          VARCHAR(50)    NULL,
  fulfillment_status           VARCHAR(50)    NOT NULL DEFAULT 'pending',
  fulfillment_notes            TEXT           NULL,
  metadata                     JSON           NULL,
  created_at                   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stripe_pi (stripe_payment_intent_id),
  INDEX idx_ord_calendar (calendar_id),
  INDEX idx_ord_email (customer_email),
  INDEX idx_ord_status (status),
  INDEX idx_ord_created (created_at),
  CONSTRAINT fk_ord_calendar FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id            VARCHAR(36)   NOT NULL,
  order_id      VARCHAR(36)   NOT NULL,
  sku           VARCHAR(50)   NOT NULL,
  product_type  VARCHAR(50)   NOT NULL,
  quantity      INT           NOT NULL DEFAULT 1,
  unit_price    DECIMAL(10,2) NOT NULL,
  calendar_id   VARCHAR(36)   NULL,
  metadata      JSON          NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_oi_order (order_id),
  INDEX idx_oi_calendar (calendar_id),
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_calendar FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id            INT           NOT NULL AUTO_INCREMENT,
  username      VARCHAR(100)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collaborations (
  id            VARCHAR(36)   NOT NULL,
  owner_email   VARCHAR(255)  NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_collab_owner (owner_email),
  INDEX idx_collab_owner (owner_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collaboration_members (
  id                 VARCHAR(36)   NOT NULL,
  collaboration_id   VARCHAR(36)   NOT NULL,
  email              VARCHAR(255)  NOT NULL,
  role               VARCHAR(20)   NOT NULL DEFAULT 'member',
  status             VARCHAR(20)   NOT NULL DEFAULT 'pending',
  invited_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_collab_member (collaboration_id, email),
  INDEX idx_cm_email (email),
  INDEX idx_cm_status (status),
  CONSTRAINT fk_cm_collaboration FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shared_tasks (
  id                 VARCHAR(36)   NOT NULL,
  collaboration_id   VARCHAR(36)   NOT NULL,
  author_email       VARCHAR(255)  NOT NULL,
  text               TEXT          NOT NULL,
  done               TINYINT(1)    NOT NULL DEFAULT 0,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_st_collab (collaboration_id),
  CONSTRAINT fk_st_collaboration FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gift_ideas (
  id                 VARCHAR(36)   NOT NULL,
  collaboration_id   VARCHAR(36)   NOT NULL,
  author_email       VARCHAR(255)  NOT NULL,
  text               TEXT          NOT NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_gi_collab (collaboration_id),
  CONSTRAINT fk_gi_collaboration FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function main() {
  const seedAdmin = process.argv.includes('--seed-admin');
  let conn;

  try {
    console.log(`Connecting to MySQL [${testingMode ? 'TEST' : 'PROD'}] → ${config.database}...`);
    conn = await mysql.createConnection(config);
    console.log('Connected.');

    console.log('Running DDL migrations...');
    await conn.query(DDL);
    console.log('Tables created / already exist.');

    if (seedAdmin) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD || 'changeme123!';
      const hash = await bcrypt.hash(password, 12);

      const [rows] = await conn.execute(
        'SELECT id FROM admin_users WHERE username = ?',
        [username]
      );

      if (rows.length === 0) {
        await conn.execute(
          'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
          [username, hash]
        );
        console.log(`Admin user '${username}' created.`);
        console.log(`Password: ${password}`);
        console.log('IMPORTANT: Change the password after first login!');
      } else {
        console.log(`Admin user '${username}' already exists, skipping.`);
      }
    }

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();

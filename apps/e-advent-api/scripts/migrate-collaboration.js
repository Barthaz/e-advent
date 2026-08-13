/**
 * scripts/migrate-collaboration.js
 * Creates collaboration, shared_tasks, and gift_ideas tables.
 *
 * Run: node scripts/migrate-collaboration.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getMysqlConfig } = require('../config/app');

const config = {
  ...getMysqlConfig(),
  multipleStatements: true,
};

async function tableExists(conn, table) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [config.database, table]
  );
  return rows[0].cnt > 0;
}

async function main() {
  let conn;
  try {
    console.log('Connecting to MySQL...');
    conn = await mysql.createConnection(config);
    console.log('Connected.');

    if (!(await tableExists(conn, 'collaborations'))) {
      console.log('Creating collaborations...');
      await conn.query(`
        CREATE TABLE collaborations (
          id            VARCHAR(36)   NOT NULL,
          owner_email   VARCHAR(255)  NOT NULL,
          created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_collab_owner (owner_email),
          INDEX idx_collab_owner (owner_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } else {
      console.log('collaborations already exists, skipping.');
    }

    if (!(await tableExists(conn, 'collaboration_members'))) {
      console.log('Creating collaboration_members...');
      await conn.query(`
        CREATE TABLE collaboration_members (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } else {
      console.log('collaboration_members already exists, skipping.');
    }

    if (!(await tableExists(conn, 'shared_tasks'))) {
      console.log('Creating shared_tasks...');
      await conn.query(`
        CREATE TABLE shared_tasks (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } else {
      console.log('shared_tasks already exists, skipping.');
    }

    if (!(await tableExists(conn, 'gift_ideas'))) {
      console.log('Creating gift_ideas...');
      await conn.query(`
        CREATE TABLE gift_ideas (
          id                 VARCHAR(36)   NOT NULL,
          collaboration_id   VARCHAR(36)   NOT NULL,
          author_email       VARCHAR(255)  NOT NULL,
          text               TEXT          NOT NULL,
          created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_gi_collab (collaboration_id),
          CONSTRAINT fk_gi_collaboration FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } else {
      console.log('gift_ideas already exists, skipping.');
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

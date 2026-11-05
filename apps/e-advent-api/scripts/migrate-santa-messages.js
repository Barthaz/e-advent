/**
 * Santa voice messages schema (additive, no changes to existing tables).
 * Run: node scripts/migrate-santa-messages.js --test | --prod
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS santa_message_drafts (
    id                VARCHAR(36)   NOT NULL,
    draft_key_hash    CHAR(64)      NOT NULL,
    mode              VARCHAR(20)   NOT NULL COMMENT 'standalone | letter_addon',
    personalization_enc MEDIUMTEXT  NULL,
    script_enc        MEDIUMTEXT    NULL,
    status            VARCHAR(20)   NOT NULL DEFAULT 'draft' COMMENT 'draft | ordered | expired',
    order_id          VARCHAR(36)   NULL,
    expires_at        DATETIME      NOT NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_smd_expires (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS santa_message_instances (
    id                        VARCHAR(36)   NOT NULL,
    order_id                  VARCHAR(36)   NOT NULL,
    order_item_id             VARCHAR(36)   NOT NULL,
    instance_index            INT           NOT NULL DEFAULT 0,
    sku                       VARCHAR(50)   NOT NULL,
    mode                      VARCHAR(20)   NOT NULL COMMENT 'standalone | letter_addon',
    status                    VARCHAR(30)   NOT NULL,
    draft_id                  VARCHAR(36)   NULL,
    personalization_enc       MEDIUMTEXT    NULL,
    script_enc                MEDIUMTEXT    NULL,
    script_version            VARCHAR(40)   NULL,
    script_approved_at        DATETIME      NULL,
    submit_count              INT           NOT NULL DEFAULT 0,
    activation_token_hash     CHAR(64)      NULL,
    activation_token_version  INT           NOT NULL DEFAULT 1,
    play_token_hash           CHAR(64)      NULL,
    play_token_version        INT           NOT NULL DEFAULT 1,
    audio_key                 VARCHAR(1024) NULL,
    audio_duration_seconds    DECIMAL(6,1)  NULL,
    audio_bytes               INT           NULL,
    audio_source              VARCHAR(20)   NULL COMMENT 'tts | upload',
    tts_attempts              INT           NOT NULL DEFAULT 0,
    tts_next_attempt_at       DATETIME      NULL,
    last_error_code           VARCHAR(80)   NULL,
    paid_at                   DATETIME      NULL,
    audio_ready_at            DATETIME      NULL,
    delivered_at              DATETIME      NULL,
    first_played_at           DATETIME      NULL,
    retention_until           DATETIME      NULL,
    created_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_smi_item (order_item_id, instance_index),
    UNIQUE KEY uq_smi_activation (activation_token_hash),
    UNIQUE KEY uq_smi_play (play_token_hash),
    INDEX idx_smi_order (order_id),
    INDEX idx_smi_status (status, tts_next_attempt_at),
    INDEX idx_smi_retention (retention_until)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS santa_message_events (
    id           BIGINT        NOT NULL AUTO_INCREMENT,
    message_id   VARCHAR(36)   NOT NULL,
    event_type   VARCHAR(60)   NOT NULL,
    actor        VARCHAR(20)   NOT NULL DEFAULT 'system' COMMENT 'system | customer | admin | cron',
    details      JSON          NULL,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_sme_message (message_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS santa_message_deliveries (
    id              VARCHAR(36)   NOT NULL,
    message_id      VARCHAR(36)   NOT NULL,
    delivery_type   VARCHAR(30)   NOT NULL COMMENT 'activation | order_received | audio_ready',
    version         INT           NOT NULL DEFAULT 1,
    status          VARCHAR(20)   NOT NULL DEFAULT 'pending' COMMENT 'pending | sending | sent | failed',
    attempts        INT           NOT NULL DEFAULT 0,
    next_attempt_at DATETIME      NULL,
    last_error      VARCHAR(255)  NULL,
    sent_at         DATETIME      NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_smdl (message_id, delivery_type, version),
    INDEX idx_smdl_pending (status, next_attempt_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function migrate(conn) {
  for (const ddl of TABLES) await conn.execute(ddl);
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
    console.log(`Santa messages schema ready on ${process.env[prefix + 'DATABASE']}.`);
  } finally { await conn.end(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate, TABLES };

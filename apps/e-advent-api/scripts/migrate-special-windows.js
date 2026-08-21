/**
 * Migration: special_window_progress + date_gate_entries
 */
require('dotenv').config();
const { query } = require('../config/database');

const SQL = `
CREATE TABLE IF NOT EXISTS special_window_progress (
  id                 VARCHAR(36)   NOT NULL PRIMARY KEY,
  calendar_id        VARCHAR(36)   NOT NULL,
  task_id            VARCHAR(64)   NOT NULL,
  day                TINYINT       NOT NULL,
  status             ENUM('NOT_STARTED','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
  payload_version    INT           NOT NULL DEFAULT 1,
  payload            JSON          NOT NULL,
  started_at         DATETIME      NULL,
  completed_at       DATETIME      NULL,
  updated_at         DATETIME      NOT NULL,
  UNIQUE KEY uq_calendar_task (calendar_id, task_id),
  KEY idx_calendar_day (calendar_id, day)
);

CREATE TABLE IF NOT EXISTS date_gate_entries (
  id                 VARCHAR(36)   NOT NULL PRIMARY KEY,
  calendar_id        VARCHAR(36)   NOT NULL,
  task_id            VARCHAR(64)   NOT NULL,
  reveal_at          DATETIME      NOT NULL,
  sealed_payload     JSON          NOT NULL,
  revealed_at        DATETIME      NULL,
  created_at         DATETIME      NOT NULL,
  UNIQUE KEY uq_date_gate (calendar_id, task_id)
);
`;

async function migrate() {
  for (const statement of SQL.split(';').filter((s) => s.trim())) {
    await query(statement);
  }
  console.log('✓ special_window_progress + date_gate_entries migrated');
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

'use strict';
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env'), quiet: true });
const { randomUUID } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { storageInfo, writeR2Audio, readR2Audio, deleteR2Audio } = require('../services/santaMessages/r2');
const { santaConfig } = require('../services/santaMessages/config');

async function main() {
  const config = santaConfig();
  const storageChecks = {
    'SANTA_AUDIO_STORAGE=r2': storageInfo().provider === 'r2',
    'R2: komplet danych dostępu': storageInfo().r2Configured,
    'R2_ACCOUNT_ID: poprawny format': /^[a-f0-9]{32}$/i.test(process.env.R2_ACCOUNT_ID || ''),
  };
  const r2Only = process.argv.includes('--r2-only');
  const checks = r2Only ? storageChecks : {
    ...storageChecks,
    'FRONTEND_URL: docelowy adres HTTPS': /^https:\/\//.test(process.env.FRONTEND_URL || ''),
    'SANTA_TOKEN_SECRET lub JWT_SECRET (min. 32 znaki)': (process.env.SANTA_TOKEN_SECRET || process.env.JWT_SECRET || '').length >= 32,
    'SANTA_DATA_KEY lub JWT_SECRET (min. 32 znaki)': (process.env.SANTA_DATA_KEY || process.env.JWT_SECRET || '').length >= 32,
    'E-mail: komplet ustawień SMTP': ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'].every((key) => Boolean(process.env[key])),
    'SANTA_FULFILLMENT_ENABLED': config.fulfillmentEnabled,
    'SANTA_SCRIPT_APPROVAL_REQUIRED': config.scriptApprovalRequired,
    'SANTA_ADMIN_REVIEW_REQUIRED': config.adminReviewRequired,
    'SANTA_TTS_AUTOMATION_ENABLED=false (realizacja ręczna)': !config.ttsAutomationEnabled,
    'SANTA_AUDIO_RETENTION_DAYS=365 (zgodnie z ofertą)': config.audioRetentionDays === 365,
    'CRON_SECRET': Boolean(process.env.CRON_SECRET),
  };
  for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? 'OK' : 'BRAK'}: ${name}`);
  console.log('Ten sprawdzian nie łączy się z MySQL ani SMTP. Migrację, webhook Stripe i prywatność bucketu sprawdź według docs/SANTA-R2.md.');
  if (Object.values(storageChecks).every(Boolean) && (r2Only || process.argv.includes('--r2'))) {
    const key = `santa-messages/healthcheck/${randomUUID()}.mp3`;
    const sample = await readFile(path.join(__dirname, '..', '..', 'e-advent-frontend', 'public', 'assets', 'santa_sample.mp3'));
    let written = false;
    try {
      await writeR2Audio(key, sample); written = true;
      const downloaded = await readR2Audio(key);
      if (!downloaded?.equals(sample)) throw new Error('R2_READ_MISMATCH');
      console.log('OK: zapis i odczyt kontrolnego MP3 z R2.');
    } finally {
      if (written) { await deleteR2Audio(key); console.log('OK: usunięto kontrolny plik R2.'); }
    }
  }
  if (Object.values(checks).some((ok) => !ok)) process.exitCode = 1;
}
main().catch((error) => { console.error(`Sprawdzenie nie powiodło się: ${error.code || error.name || 'ERROR'}`); process.exitCode = 1; });

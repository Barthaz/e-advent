'use strict';

const { query, withNamedLocks } = require('../../config/database');
const { SANTA_CERTIFICATE_SKU } = require('../../config/products');
const { fail } = require('./certificatePdf');
const { readExistingNumber } = require('./certificateSerial');

const GENERATOR_SERIAL_PREFIX = 'GEN';
const GENERATOR_LOCK = 'certificate-serial-gen';

function parseTasks(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return [raw];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return [parsed];
    } catch {
      return [];
    }
  }
  return [];
}

function readCertificateMeta(tasks) {
  const first = parseTasks(tasks)[0];
  if (!first || typeof first !== 'object') return {};
  return first;
}

function readStoredGeneratorNumber(tasks) {
  return readExistingNumber(readCertificateMeta(tasks));
}

async function allocateGeneratorCertificateNumber(existingTasks) {
  const fromPayload = readStoredGeneratorNumber(existingTasks);
  if (fromPayload) return fromPayload;

  return withNamedLocks([GENERATOR_LOCK], async () => {
    const [maxRows] = await query(
      `SELECT COALESCE(MAX(CAST(JSON_UNQUOTE(
         COALESCE(
           JSON_EXTRACT(tasks, '$[0].certificateNumber'),
           JSON_EXTRACT(tasks, '$.certificateNumber')
         )
       ) AS UNSIGNED)), 0) AS max_n
       FROM calendars
       WHERE origin = 'generator'
         AND sku = ?`,
      [SANTA_CERTIFICATE_SKU],
    );
    return Number(maxRows[0]?.max_n || 0) + 1;
  });
}

function buildCertificateTasks({ childName, variant, certificateNumber }) {
  return [{ childName, variant, certificateNumber }];
}

function assertGeneratorCertificate(row) {
  if (!row) {
    throw fail('Nie znaleziono certyfikatu.', 404, 'ITEM_NOT_FOUND');
  }
  if (row.origin !== 'generator' || row.product_type !== 'certificate') {
    throw fail('Pobieranie PDF generatora jest dostępne tylko dla certyfikatów z panelu.', 400, 'NOT_GENERATOR_CERTIFICATE');
  }
}

module.exports = {
  GENERATOR_SERIAL_PREFIX,
  allocateGeneratorCertificateNumber,
  buildCertificateTasks,
  parseTasks,
  readCertificateMeta,
  readStoredGeneratorNumber,
  assertGeneratorCertificate,
};

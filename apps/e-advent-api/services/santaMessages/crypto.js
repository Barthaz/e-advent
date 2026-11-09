'use strict';

const { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual, hkdfSync } = require('node:crypto');

let warnedFallback = false;

function rootSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required for Santa message tokens');
  if (!warnedFallback && process.env.NODE_ENV !== 'test') {
    warnedFallback = true;
    console.warn('[santa] SANTA_TOKEN_SECRET / SANTA_DATA_KEY not set — deriving them from JWT_SECRET.');
  }
  return secret;
}

function derived(label) {
  return Buffer.from(hkdfSync('sha256', rootSecret(), 'e-advent-santa', label, 32));
}

function tokenSecret() {
  return process.env.SANTA_TOKEN_SECRET ? Buffer.from(process.env.SANTA_TOKEN_SECRET) : derived('tokens');
}

function dataKey() {
  const raw = process.env.SANTA_DATA_KEY;
  // Any string works; hashing gives a fixed 32-byte AES key.
  return raw ? createHash('sha256').update(raw).digest() : derived('data');
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

/**
 * Activation/play tokens are derived (not stored): the same token can be re-sent
 * after an SMTP failure, and bumping the version revokes every earlier link.
 */
function deriveToken(kind, messageId, version) {
  return createHmac('sha256', tokenSecret()).update(`${kind}:${messageId}:${version}`).digest('base64url');
}

function tokenHash(token) {
  return sha256(`santa-token:${token}`);
}

function isTokenShape(token) {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

function newDraftKey() {
  return randomBytes(32).toString('base64url');
}

function encryptJson(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dataKey(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64')}`;
}

function decryptJson(payload) {
  if (!payload) return null;
  const [version, data] = String(payload).split(':');
  if (version !== 'v1' || !data) throw new Error('Unsupported encrypted payload');
  const raw = Buffer.from(data, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', dataKey(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
}

function audioSignature(messageId, expiresAt, download, version = 1) {
  return createHmac('sha256', tokenSecret()).update(`audio:${messageId}:${expiresAt}:${download ? 1 : 0}:${version}`).digest('base64url');
}

function verifyAudioSignature(messageId, expiresAt, download, signature, version = 1) {
  if (typeof signature !== 'string') return false;
  const expected = Buffer.from(audioSignature(messageId, expiresAt, download, version));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

module.exports = {
  sha256,
  deriveToken,
  tokenHash,
  isTokenShape,
  newDraftKey,
  encryptJson,
  decryptJson,
  audioSignature,
  verifyAudioSignature,
};

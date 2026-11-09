'use strict';

const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

function storageInfo() {
  const provider = process.env.SANTA_AUDIO_STORAGE || (process.env.NODE_ENV === 'production' ? 'r2' : 'local');
  const configured = ['R2_ACCOUNT_ID', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
    .every((key) => Boolean(process.env[key]?.trim()));
  return { provider, r2Configured: configured, maxAudioBytes: MAX_AUDIO_BYTES };
}

function client() {
  if (!storageInfo().r2Configured) {
    throw Object.assign(new Error('Uzupełnij konfigurację prywatnego magazynu R2 w środowisku API.'), { code: 'R2_NOT_CONFIGURED', status: 400 });
  }
  const account = process.env.R2_ACCOUNT_ID.trim();
  if (!/^[a-f0-9]{32}$/i.test(account)) throw new Error('Invalid R2 account ID');
  const jurisdiction = process.env.R2_JURISDICTION?.trim() || '';
  if (!['', 'eu', 'fedramp'].includes(jurisdiction)) throw new Error('Invalid R2 jurisdiction');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${account}${jurisdiction ? `.${jurisdiction}` : ''}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(), secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim() },
    // R2 does not implement every optional AWS checksum extension.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    maxAttempts: 2,
  });
}

function validateObjectKey(value) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()
      || Buffer.byteLength(value) > 1024 || /[\x00-\x1f\x7f\\]/.test(value)
      || value.startsWith('/') || value.includes('://') || value.split('/').some((part) => part === '..' || part === '.')) {
    throw Object.assign(new Error('Podaj klucz obiektu z prywatnego bucketu R2, np. gotowe/zamowienie-123.mp3 (bez adresu URL).'), { code: 'R2_INVALID_KEY', status: 400 });
  }
  return value;
}

async function send(command) {
  const connection = client();
  try {
    return await connection.send(command, { abortSignal: AbortSignal.timeout(30_000) });
  } finally {
    connection.destroy();
  }
}

async function readR2Audio(objectKey) {
  const Key = validateObjectKey(objectKey);
  const connection = client();
  let body;
  try {
    const response = await connection.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME.trim(), Key }), { abortSignal: AbortSignal.timeout(30_000) });
    body = response.Body;
    if (Number(response.ContentLength) > MAX_AUDIO_BYTES) throw Object.assign(new Error('Plik jest za duży (maks. 4 MB).'), { status: 400, code: 'AUDIO_TOO_LARGE' });
    if (!body) return null;
    const chunks = [];
    let size = 0;
    for await (const chunk of body) {
      size += chunk.length;
      if (size > MAX_AUDIO_BYTES) throw Object.assign(new Error('Plik jest za duży (maks. 4 MB).'), { status: 400, code: 'AUDIO_TOO_LARGE' });
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) return null;
    throw error;
  } finally {
    body?.destroy?.();
    connection.destroy();
  }
}

async function writeR2Audio(key, buffer) {
  await send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME?.trim(), Key: key, Body: buffer, ContentType: 'audio/mpeg', CacheControl: 'private, no-store' }));
}

async function deleteR2Audio(key) {
  await send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME?.trim(), Key: validateObjectKey(key) }));
}

module.exports = { storageInfo, validateObjectKey, readR2Audio, writeR2Audio, deleteR2Audio, MAX_AUDIO_BYTES };

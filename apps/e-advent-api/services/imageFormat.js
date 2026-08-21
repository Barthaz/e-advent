'use strict';

const path = require('path');

const FORMAT_ERROR =
  'Wczytaj zdjęcie JPG, PNG, WEBP lub GIF (do 10 MB). Zdjęcia HEIC z iPhone’a zapisz jako JPG.';
const HEIC_ERROR =
  'Zdjęcia HEIC z iPhone’a nie są obsługiwane. Zapisz je jako JPG lub PNG i wczytaj ponownie.';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/x-windows-bmp',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);

function sniffImageFormat(buffer) {
  if (!buffer || buffer.length < 12) return null;
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'gif';
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return 'bmp';
  if (
    bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return 'webp';
  }
  if (bytes.toString('ascii', 4, 8) === 'ftyp') {
    const brand = bytes.toString('ascii', 8, 12).toLowerCase();
    if (['heic', 'heif', 'mif1', 'msf1', 'heix', 'hevc'].includes(brand)) return 'heic';
  }
  return null;
}

function isPdfSafeImageFormat(format) {
  return format === 'jpeg' || format === 'png';
}

function isHeicFile(file) {
  const mime = String(file?.mimetype || '').toLowerCase();
  const ext = path.extname(file?.originalname || '').toLowerCase();
  return mime === 'image/heic' || mime === 'image/heif' || ext === '.heic' || ext === '.heif';
}

function isAllowedUploadFile(file) {
  if (isHeicFile(file)) return false;
  const mime = String(file?.mimetype || '').toLowerCase();
  const ext = path.extname(file?.originalname || '').toLowerCase();
  if (ALLOWED_MIME_TYPES.has(mime)) return true;
  if ((!mime || mime === 'application/octet-stream') && ALLOWED_EXTENSIONS.has(ext)) return true;
  return false;
}

function uploadRejectMessage(file) {
  return isHeicFile(file) ? HEIC_ERROR : FORMAT_ERROR;
}

module.exports = {
  FORMAT_ERROR,
  HEIC_ERROR,
  ALLOWED_MIME_TYPES,
  sniffImageFormat,
  isPdfSafeImageFormat,
  isAllowedUploadFile,
  uploadRejectMessage,
};

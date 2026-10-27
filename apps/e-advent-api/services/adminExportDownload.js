'use strict';

const { pngBufferToFitJpeg } = require('./scratch/pngFitJpeg');

/** Vercel serverless response limit is 4.5 MB. Stay under it or Chrome shows 200 + net::ERR_FAILED. */
const INLINE_MAX_BYTES = Math.floor(3.5 * 1024 * 1024);

function sanitizeFilename(name) {
  return String(name || 'download').replace(/[^\w.\-]+/g, '_').slice(0, 120);
}

function tooLargeError() {
  const error = new Error(
    'Wygenerowany plik jest za duży, żeby pobrać go bezpośrednio z API.',
  );
  error.status = 413;
  error.code = 'EXPORT_TOO_LARGE';
  return error;
}

function sendInline(res, body, contentType, filename) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(body.length));
  res.setHeader('Cache-Control', 'private, no-store');
  return res.send(body);
}

async function parkExportOnBlob(body, { folder, safeName, contentType }) {
  // Only when a real Blob token exists. Vercel=1 without BLOB_READ_WRITE_TOKEN
  // throws "No blob credentials found" on every oversized export.
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { put } = require('@vercel/blob');
    return await put(`${folder}/${Date.now()}-${safeName}`, body, {
      access: 'public',
      addRandomSuffix: true,
      contentType,
      cacheControlMaxAge: 600,
    });
  } catch (err) {
    console.error('Export blob upload failed:', err && err.message);
    return null;
  }
}

function jpegFilename(name) {
  if (/\.jpe?g$/i.test(name)) return name;
  if (/\.png$/i.test(name)) return name.replace(/\.png$/i, '.jpg');
  return `${name}.jpg`;
}

/**
 * Send a generated file inline when it fits, otherwise park it on Blob (or JPEG-compress a PNG).
 * @param {import('express').Response} res
 * @param {{ buffer: Buffer, contentType: string, filename: string, folder?: string, maxBytes?: number }} opts
 */
async function sendAdminDownload(res, { buffer, contentType, filename, folder = 'exports', maxBytes = INLINE_MAX_BYTES }) {
  const safeName = sanitizeFilename(filename);
  const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  if (body.length <= maxBytes) {
    return sendInline(res, body, contentType, safeName);
  }

  const blob = await parkExportOnBlob(body, { folder, safeName, contentType });
  if (blob && blob.url) {
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({
      downloadUrl: blob.url,
      filename: safeName,
      bytes: body.length,
    });
  }

  if (contentType === 'image/png' || contentType === 'image/jpeg') {
    const jpeg = await pngBufferToFitJpeg(body, maxBytes);
    if (jpeg) {
      return sendInline(res, jpeg, 'image/jpeg', jpegFilename(safeName));
    }
  }

  throw tooLargeError();
}

module.exports = { sendAdminDownload, INLINE_MAX_BYTES };

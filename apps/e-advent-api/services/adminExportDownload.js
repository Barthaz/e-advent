'use strict';

/** Vercel serverless response limit is 4.5 MB. Stay under it or Chrome shows 200 + net::ERR_FAILED. */
const INLINE_MAX_BYTES = Math.floor(3.5 * 1024 * 1024);

function sanitizeFilename(name) {
  return String(name || 'download').replace(/[^\w.\-]+/g, '_').slice(0, 120);
}

/**
 * Send a generated file inline when it fits, otherwise park it on Blob and return a URL.
 * @param {import('express').Response} res
 * @param {{ buffer: Buffer, contentType: string, filename: string, folder?: string }} opts
 */
async function sendAdminDownload(res, { buffer, contentType, filename, folder = 'exports', maxBytes = INLINE_MAX_BYTES }) {
  const safeName = sanitizeFilename(filename);
  const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  if (body.length <= maxBytes) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Length', String(body.length));
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(body);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const error = new Error(
      'Wygenerowany plik jest za duży, żeby pobrać go bezpośrednio z API. Użyj PDF albo spróbuj ponownie ze strony kalendarza.',
    );
    error.status = 413;
    error.code = 'EXPORT_TOO_LARGE';
    throw error;
  }

  const { put } = require('@vercel/blob');
  const blob = await put(`${folder}/${Date.now()}-${safeName}`, body, {
    access: 'public',
    addRandomSuffix: true,
    contentType,
    cacheControlMaxAge: 600,
  });

  res.setHeader('Cache-Control', 'private, no-store');
  return res.json({
    downloadUrl: blob.url,
    filename: safeName,
    bytes: body.length,
  });
}

module.exports = { sendAdminDownload, INLINE_MAX_BYTES };

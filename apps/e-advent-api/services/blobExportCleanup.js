'use strict';

/**
 * Admin exports parked on Vercel Blob (see adminExportDownload). Customer uploads share the
 * store under other prefixes (designs/, special-window folders) and must never be touched.
 */
const EXPORT_PREFIXES = ['scratch-exports/', 'exports/'];

/** Skip files from the last hour so a download started right before the cron still works. */
const MIN_AGE_MS = 60 * 60 * 1000;

/**
 * Delete parked admin exports. Without a Blob token there is nothing to clean.
 * @param {{ now?: number }} [options]
 * @returns {Promise<{ skipped?: boolean, deleted: number, bytes: number }>}
 */
async function cleanupExportBlobs({ now = Date.now() } = {}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { skipped: true, deleted: 0, bytes: 0 };
  const { list, del } = require('@vercel/blob');
  let deleted = 0;
  let bytes = 0;

  for (const prefix of EXPORT_PREFIXES) {
    let cursor;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      const stale = page.blobs.filter((blob) => now - new Date(blob.uploadedAt).getTime() >= MIN_AGE_MS);
      if (stale.length) {
        await del(stale.map((blob) => blob.url));
        deleted += stale.length;
        bytes += stale.reduce((sum, blob) => sum + (blob.size || 0), 0);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }

  return { deleted, bytes };
}

module.exports = { cleanupExportBlobs, EXPORT_PREFIXES };

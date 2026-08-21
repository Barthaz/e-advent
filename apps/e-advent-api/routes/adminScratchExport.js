'use strict';

const { query } = require('../config/database');
const {
  buildScratchPdfBuffer,
  scratchExportFilename,
} = require('../services/scratch/ScratchPdfService');
const { pdfBufferToPng } = require('../services/scratch/PdfRasterService');
const {
  normalizeExportFormat,
  normalizeDpi,
} = require('../services/scratch/scratchWindowLayout');

function parseTasks(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function resolveProductType(row) {
  if (row.product_type === 'scratch' || row.product_type === 'interactive' || row.product_type === 'letter') {
    return row.product_type;
  }
  if (row.sku && String(row.sku).startsWith('scratch')) return 'scratch';
  return row.product_type || null;
}

async function loadScratchCalendarOrRespond(req, res) {
  const { id } = req.params;
  const [rows] = await query('SELECT * FROM calendars WHERE id = ?', [id]);
  if (!rows.length) {
    res.status(404).json({ error: 'Calendar not found' });
    return null;
  }
  const row = rows[0];
  const productType = resolveProductType(row);
  if (productType !== 'scratch') {
    res.status(400).json({
      error: 'NOT_SCRATCH_CALENDAR',
      message: 'Eksport PDF/PNG jest dostępny tylko dla kalendarzy zdrapkowych',
    });
    return null;
  }
  return row;
}

function sendExportError(res, error) {
  const status = error.status || 500;
  console.error('Scratch export error:', error);
  return res.status(status).json({
    error: error.code || 'SCRATCH_EXPORT_FAILED',
    message: error.message || 'Nie udało się wygenerować pliku',
  });
}

/**
 * Register scratch export routes on an Express router (admin-authenticated).
 * @param {import('express').Router} router
 * @param {Function} authAdmin
 */
function registerScratchExportRoutes(router, authAdmin) {
  router.get('/calendars/:id/export/pdf', authAdmin, async (req, res) => {
    try {
      const row = await loadScratchCalendarOrRespond(req, res);
      if (!row) return;

      const format = normalizeExportFormat(req.query.format || row.format || 'A4');
      const pdfBuffer = await buildScratchPdfBuffer({
        format,
        designUrl: row.design_url,
        tasks: parseTasks(row.tasks),
      });

      const filename = scratchExportFilename(row.id, format, 'pdf');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (error) {
      return sendExportError(res, error);
    }
  });

  router.get('/calendars/:id/export/png', authAdmin, async (req, res) => {
    try {
      const row = await loadScratchCalendarOrRespond(req, res);
      if (!row) return;

      const format = normalizeExportFormat(req.query.format || row.format || 'A4');
      const dpi = normalizeDpi(req.query.dpi || 600);

      const pdfBuffer = await buildScratchPdfBuffer({
        format,
        designUrl: row.design_url,
        tasks: parseTasks(row.tasks),
      });
      const pngBuffer = await pdfBufferToPng(pdfBuffer, { format, dpi });

      const filename = scratchExportFilename(row.id, format, 'png');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pngBuffer.length);
      return res.send(pngBuffer);
    } catch (error) {
      return sendExportError(res, error);
    }
  });
}

module.exports = { registerScratchExportRoutes };

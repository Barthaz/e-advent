'use strict';

const { param, query: qv, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { SANTA_CERTIFICATE_SKU } = require('../config/products');
const {
  buildCertificatePdf,
  certificateFilename,
  fail,
  normalizeVariant,
} = require('../services/certificate/certificatePdf');
const { allocateCertificateNumber, parseMetadata } = require('../services/certificate/certificateSerial');

function sendExportError(res, error) {
  const status = error.status || 500;
  console.error('Certificate export error:', error);
  return res.status(status).json({
    error: error.code || 'CERTIFICATE_EXPORT_FAILED',
    message: error.message || 'Nie udało się wygenerować certyfikatu.',
  });
}

module.exports = (router, authAdmin) => {
  router.get('/orders/:orderId/items/:itemId/certificate.pdf', authAdmin, [
    param('orderId').isUUID().withMessage('Nieprawidłowy identyfikator zamówienia.'),
    param('itemId').isUUID().withMessage('Nieprawidłowy identyfikator pozycji.'),
    qv('variant').notEmpty().withMessage('Wybierz wariant męski (ON) albo damski (ONA).'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'VALIDATION', message: errors.array()[0].msg, errors: errors.array() });
    }

    const variant = normalizeVariant(req.query.variant);
    if (!variant) {
      return sendExportError(res, fail('Wybierz wariant męski (ON) albo damski (ONA).', 400, 'BAD_VARIANT'));
    }

    try {
      const [rows] = await query(
        'SELECT * FROM order_items WHERE id = ? AND order_id = ?',
        [req.params.itemId, req.params.orderId],
      );
      if (!rows.length) {
        throw fail('Nie znaleziono pozycji zamówienia.', 404, 'ITEM_NOT_FOUND');
      }
      const item = rows[0];
      if (item.sku !== SANTA_CERTIFICATE_SKU) {
        throw fail('Pobieranie PDF jest dostępne tylko dla certyfikatu Grzecznego Dziecka.', 400, 'NOT_CERTIFICATE');
      }
      const metadata = parseMetadata(item.metadata);
      const childName = String(metadata.childName || '').trim();
      const serialNumber = await allocateCertificateNumber({ ...item, metadata });
      const pdfBuffer = await buildCertificatePdf({ variant, childName, serialNumber });
      const filename = certificateFilename({ variant, serialNumber });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (error) {
      return sendExportError(res, error);
    }
  });
};

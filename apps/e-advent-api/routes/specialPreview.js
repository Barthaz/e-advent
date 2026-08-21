'use strict';

const express = require('express');
const {
  getSpecialDescriptor,
} = require('../services/special/SpecialConfigRegistry');
const { renderSpecialPdf, resolveContentPack } = require('../services/special/DocumentRegistry');

const router = express.Router();

function getPreviewExportDescriptor(catalogTaskId) {
  const descriptor = getSpecialDescriptor(catalogTaskId);
  if (!descriptor?.document || descriptor.capabilities?.canPrint === false) {
    return null;
  }
  return descriptor;
}

router.post('/preview/pdf', async (req, res) => {
  try {
    const catalogTaskId = String(req.body?.catalogTaskId || '').trim();
    const descriptor = getPreviewExportDescriptor(catalogTaskId);
    if (!descriptor) {
      return res.status(400).json({ error: 'This special window has no PDF export' });
    }

    let payload = req.body?.payload && typeof req.body.payload === 'object' ? { ...req.body.payload } : {};
    if (descriptor.contentKey) {
      const pack = resolveContentPack(descriptor.contentKey);
      if (pack && !payload.items) {
        payload = { ...pack, ...payload };
      }
    }

    const variant = req.body?.variant === 'INK_SAVER' ? 'INK_SAVER' : 'COLOR';
    const layout = req.body?.layout;
    const { buffer, filename } = await renderSpecialPdf(descriptor, payload, variant, layout);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('POST special preview/pdf:', error);
    const message = String(error?.message || '');
    if (/could not be decoded|wstawić zdjęcia do PDF/i.test(message)) {
      return res.status(400).json({
        error: 'Nie udało się wstawić zdjęcia do PDF. Wczytaj je ponownie jako JPG lub PNG.',
      });
    }
    res.status(500).json({ error: 'PDF render failed', message: error.message });
  }
});

module.exports = {
  router,
  getPreviewExportDescriptor,
};

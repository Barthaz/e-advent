'use strict';

/**
 * Manual/CI smoke: generate scratch PDF + PNG and verify magic bytes.
 * Usage: node scripts/smoke-scratch-export.js
 */
const fs = require('fs');
const path = require('path');
const { buildScratchPdfBuffer } = require('../services/scratch/ScratchPdfService');
const { pdfBufferToPng } = require('../services/scratch/PdfRasterService');

async function main() {
  const tasks = Array.from({ length: 24 }, (_, i) => ({
    day: i + 1,
    title: `Dzień ${i + 1}`,
    description: `Treść zadania na dzień ${i + 1}`,
  }));

  console.log('Generating A3 PDF…');
  const pdfA3 = await buildScratchPdfBuffer({
    format: 'A3',
    designUrl: '/designs/scratch/red.png',
    tasks,
    orderNumber: '000011',
  });
  if (pdfA3.slice(0, 4).toString() !== '%PDF') throw new Error('A3 PDF magic mismatch');
  console.log('A3 PDF OK', pdfA3.length, 'bytes');

  console.log('Rasterizing A3 @ 600 DPI…');
  const png = await pdfBufferToPng(pdfA3, { format: 'A3', dpi: 600 });
  if (png[0] !== 0x89 || png[1] !== 0x50 || png[2] !== 0x4e || png[3] !== 0x47) {
    throw new Error('PNG magic mismatch');
  }
  console.log('PNG OK', png.length, 'bytes');

  const outDir = path.join(__dirname, '../tmp-scratch-smoke');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'smoke-a3.pdf'), pdfA3);
  fs.writeFileSync(path.join(outDir, 'smoke-a3-600dpi.png'), png);
  console.log('Wrote samples to', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

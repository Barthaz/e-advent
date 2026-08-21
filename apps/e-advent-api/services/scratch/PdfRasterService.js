'use strict';

const { createCanvas } = require('@napi-rs/canvas');
const { pageSizePixels, normalizeExportFormat, normalizeDpi } = require('./scratchWindowLayout');

/**
 * Load pdfjs legacy build (CommonJS-friendly) for Node.
 */
async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjs;
}

/**
 * Convert first page of a PDF buffer to a PNG buffer at the requested paper size + DPI.
 *
 * @param {Buffer} pdfBuffer
 * @param {{ format?: string, dpi?: number }} options
 * @returns {Promise<Buffer>}
 */
async function pdfBufferToPng(pdfBuffer, options = {}) {
  const format = normalizeExportFormat(options.format);
  const dpi = normalizeDpi(options.dpi);
  const { width: targetW, height: targetH } = pageSizePixels(format, dpi);

  const pdfjs = await loadPdfJs();
  const data = Uint8Array.from(pdfBuffer);

  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableWorker: true,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  // PDF user space is 72 DPI; scale so we rasterize directly at target pixels (no stretch blur).
  const base = page.getViewport({ scale: 1 });
  const scaleX = targetW / base.width;
  const scaleY = targetH / base.height;
  // Prefer exact width; height should match for ISO paper aspect.
  const scale = Math.min(scaleX, scaleY);
  const viewport = page.getViewport({ scale });

  const canvasW = Math.round(viewport.width);
  const canvasH = Math.round(viewport.height);
  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) {
    ctx.imageSmoothingQuality = 'high';
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  let outCanvas = canvas;
  if (canvasW !== targetW || canvasH !== targetH) {
    outCanvas = createCanvas(targetW, targetH);
    const octx = outCanvas.getContext('2d');
    octx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in octx) {
      octx.imageSmoothingQuality = 'high';
    }
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, targetW, targetH);
    octx.drawImage(canvas, 0, 0, targetW, targetH);
  }

  // compressionLevel 0 = least compression / fastest / largest (best visual fidelity for print proofs)
  return outCanvas.toBuffer('image/png', { compressionLevel: 1 });
}

module.exports = {
  pdfBufferToPng,
};

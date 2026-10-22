'use strict';

const { createCanvas } = require('@napi-rs/canvas');
const { pageSizePixels, normalizeExportFormat, normalizeDpi } = require('./scratchWindowLayout');

/** White frame around the rasterized page (extra pixels outside the graphic). */
const PNG_BORDER_PX = 22;

/**
 * Load pdfjs legacy build (CommonJS-friendly) for Node.
 */
async function loadPdfJs() {
  // pdfjs resolves its fake worker with a computed import() that Vercel's file tracing
  // misses; pre-registering it via a literal import ships the file and skips that lookup.
  if (!globalThis.pdfjsWorker) {
    globalThis.pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  }
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjs;
}

/**
 * Expand canvas by a thin white border on each side (does not crop the graphic).
 * @param {import('@napi-rs/canvas').Canvas} source
 * @param {number} borderPx
 */
function withWhiteBorder(source, borderPx = PNG_BORDER_PX) {
  const w = source.width + borderPx * 2;
  const h = source.height + borderPx * 2;
  const framed = createCanvas(w, h);
  const ctx = framed.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, borderPx, borderPx);
  return framed;
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
  // Usual case: page renders at exact target size, so draw it straight into the
  // bordered canvas instead of copying a ~70 MP bitmap (time + ~280 MB memory).
  const direct = canvasW === targetW && canvasH === targetH;
  const border = direct ? PNG_BORDER_PX : 0;
  const canvas = createCanvas(canvasW + border * 2, canvasH + border * 2);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) {
    ctx.imageSmoothingQuality = 'high';
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
    transform: border ? [1, 0, 0, 1, border, border] : null,
  }).promise;
  await pdf.destroy();

  if (direct) return canvas.toBuffer('image/png', { compressionLevel: 1 });

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

  // Thin white frame: enlarge PNG, leave graphic untouched.
  outCanvas = withWhiteBorder(outCanvas, PNG_BORDER_PX);

  // compressionLevel 0 = least compression / fastest / largest (best visual fidelity for print proofs)
  return outCanvas.toBuffer('image/png', { compressionLevel: 1 });
}

module.exports = {
  pdfBufferToPng,
};

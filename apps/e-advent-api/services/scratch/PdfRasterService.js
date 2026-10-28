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
 * Rasterize the first page of a PDF at the requested paper size + DPI, with a white frame.
 *
 * @param {Buffer} pdfBuffer
 * @param {{ format?: string, dpi?: number }} options
 * @returns {Promise<import('@napi-rs/canvas').Canvas>}
 */
async function renderPdfToCanvas(pdfBuffer, options = {}) {
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

  if (direct) return canvas;

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
  return withWhiteBorder(outCanvas, PNG_BORDER_PX);
}

const JPEG_QUALITIES = [92, 85, 78, 70];

/**
 * Encode a canvas as the best JPEG that fits in `maxBytes`, lowering quality first and
 * then scaling down. Works on the rendered canvas directly: re-decoding a ~70 MP PNG
 * needs two more ~280 MB bitmaps and ran Vercel instances out of memory.
 *
 * @param {import('@napi-rs/canvas').Canvas} canvas
 * @param {number} maxBytes
 * @returns {Promise<Buffer|null>}
 */
async function canvasToFitJpeg(canvas, maxBytes) {
  let lastSize = 0;
  for (const quality of JPEG_QUALITIES) {
    const jpeg = await canvas.encode('jpeg', quality);
    if (jpeg.length <= maxBytes) return jpeg;
    lastSize = jpeg.length;
  }
  let scale = Math.min(0.9, Math.sqrt(maxBytes / lastSize) * 0.95);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const w = Math.max(1, Math.round(canvas.width * scale));
    const h = Math.max(1, Math.round(canvas.height * scale));
    const small = createCanvas(w, h);
    const ctx = small.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, w, h);
    const jpeg = await small.encode('jpeg', JPEG_QUALITIES[JPEG_QUALITIES.length - 1]);
    if (jpeg.length <= maxBytes) return jpeg;
    scale *= 0.85;
  }
  return null;
}

/**
 * Convert first page of a PDF buffer to a PNG buffer at the requested paper size + DPI.
 *
 * @param {Buffer} pdfBuffer
 * @param {{ format?: string, dpi?: number }} options
 * @returns {Promise<Buffer>}
 */
async function pdfBufferToPng(pdfBuffer, options = {}) {
  const canvas = await renderPdfToCanvas(pdfBuffer, options);
  return canvas.encode('png');
}

/**
 * Rasterize to a lossless PNG when it may be large, otherwise to a JPEG that fits `maxBytes`.
 *
 * @param {Buffer} pdfBuffer
 * @param {{ format?: string, dpi?: number, maxBytes: number, allowLargePng?: boolean }} options
 * @returns {Promise<{ buffer: Buffer, contentType: 'image/png'|'image/jpeg' }|null>}
 */
async function pdfBufferToImage(pdfBuffer, { maxBytes, allowLargePng = false, ...options }) {
  const canvas = await renderPdfToCanvas(pdfBuffer, options);
  if (allowLargePng) {
    return { buffer: await canvas.encode('png'), contentType: 'image/png' };
  }
  const jpeg = await canvasToFitJpeg(canvas, maxBytes);
  return jpeg ? { buffer: jpeg, contentType: 'image/jpeg' } : null;
}

module.exports = {
  canvasToFitJpeg,
  pdfBufferToImage,
  pdfBufferToPng,
};

'use strict';

/**
 * Re-encode a PNG buffer as JPEG small enough for an inline Vercel response.
 * Quality is reduced first; if still too big the bitmap is scaled down.
 * @param {Buffer} pngBuffer
 * @param {number} maxBytes
 * @returns {Promise<Buffer|null>}
 */
async function pngBufferToFitJpeg(pngBuffer, maxBytes) {
  const { loadImage, createCanvas } = require('@napi-rs/canvas');
  const img = await loadImage(pngBuffer);
  // @napi-rs/canvas takes JPEG quality as a 0–100 number; an options object is ignored.
  let quality = 90;
  let width = img.width;
  let height = img.height;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    const jpeg = canvas.toBuffer('image/jpeg', quality);
    if (jpeg.length <= maxBytes) return jpeg;
    if (quality > 50) {
      quality = Math.max(50, quality - 10);
    } else {
      width = Math.round(width * 0.82);
      height = Math.round(height * 0.82);
    }
  }
  return null;
}

module.exports = { pngBufferToFitJpeg };

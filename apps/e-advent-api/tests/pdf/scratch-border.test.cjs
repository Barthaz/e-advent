'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument, rgb } = require('../../vendor/pdf-lib');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { pdfBufferToPng } = require('../../services/scratch/PdfRasterService');

test('raster export preserves the chosen border colour around the PDF page', async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 1190.55]);
  page.drawRectangle({ x: 0, y: 0, width: 841.89, height: 1190.55, color: rgb(1, 1, 1) });
  const png = await pdfBufferToPng(Buffer.from(await pdf.save()), {
    format: 'A3', dpi: 300, borderColor: '#3c0101',
  });
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  for (const [x, y] of [[0, 0], [image.width - 1, 0], [0, image.height - 1], [image.width - 1, image.height - 1]]) {
    assert.deepEqual(Array.from(ctx.getImageData(x, y, 1, 1).data), [60, 1, 1, 255]);
  }
  assert.deepEqual(Array.from(ctx.getImageData(30, 30, 1, 1).data), [255, 255, 255, 255]);
});

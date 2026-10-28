const zlib = require('zlib');
const { loadImage } = require('@napi-rs/canvas');
const { stripPngMetadata } = require('../../services/pdfImageSource');

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (~crc) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function tinyPng(extraChunks = []) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const pixel = zlib.deflateSync(Buffer.from([0, 255, 0, 0]));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    ...extraChunks,
    chunk('IDAT', pixel),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('stripPngMetadata', () => {
  test('drops C2PA caBX and text chunks but keeps image data', async () => {
    const png = tinyPng([
      chunk('caBX', Buffer.alloc(64, 1)),
      chunk('tEXt', Buffer.from('Software\0test')),
      chunk('gAMA', Buffer.from([0, 0, 0xb1, 0x8f])),
    ]);
    const stripped = stripPngMetadata(png);

    expect(stripped.includes(Buffer.from('caBX'))).toBe(false);
    expect(stripped.includes(Buffer.from('tEXt'))).toBe(false);
    expect(stripped.includes(Buffer.from('gAMA'))).toBe(true);
    const img = await loadImage(stripped);
    expect(img.width).toBe(1);
  });

  test('returns non-PNG input unchanged', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    expect(stripPngMetadata(jpeg)).toBe(jpeg);
  });
});

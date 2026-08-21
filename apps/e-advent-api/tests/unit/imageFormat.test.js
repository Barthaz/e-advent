'use strict';

const {
  sniffImageFormat,
  isPdfSafeImageFormat,
  isAllowedUploadFile,
  uploadRejectMessage,
  HEIC_ERROR,
} = require('../../services/imageFormat');

describe('imageFormat', () => {
  test('sniffs jpeg, png, gif and webp magic bytes', () => {
    expect(sniffImageFormat(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('jpeg');
    expect(sniffImageFormat(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('png');
    expect(sniffImageFormat(Buffer.from(Buffer.concat([
      Buffer.from('GIF89a'),
      Buffer.alloc(6),
    ])))).toBe('gif');
    const webp = Buffer.alloc(12);
    webp.write('RIFF', 0);
    webp.write('WEBP', 8);
    expect(sniffImageFormat(webp)).toBe('webp');
  });

  test('only jpeg and png go into the PDF', () => {
    expect(isPdfSafeImageFormat('jpeg')).toBe(true);
    expect(isPdfSafeImageFormat('png')).toBe(true);
    expect(isPdfSafeImageFormat('webp')).toBe(false);
    expect(isPdfSafeImageFormat('gif')).toBe(false);
  });

  test('accepts common photo mime types and extensions', () => {
    expect(isAllowedUploadFile({ mimetype: 'image/jpeg', originalname: 'a.jpg' })).toBe(true);
    expect(isAllowedUploadFile({ mimetype: 'image/jpg', originalname: 'a.jpg' })).toBe(true);
    expect(isAllowedUploadFile({ mimetype: 'image/png', originalname: 'a.png' })).toBe(true);
    expect(isAllowedUploadFile({ mimetype: 'image/webp', originalname: 'a.webp' })).toBe(true);
    expect(isAllowedUploadFile({ mimetype: 'image/gif', originalname: 'a.gif' })).toBe(true);
    expect(isAllowedUploadFile({ mimetype: 'application/octet-stream', originalname: 'a.jpg' })).toBe(true);
    expect(isAllowedUploadFile({ mimetype: 'image/heic', originalname: 'a.heic' })).toBe(false);
    expect(uploadRejectMessage({ mimetype: 'image/heic', originalname: 'a.heic' })).toBe(HEIC_ERROR);
  });
});

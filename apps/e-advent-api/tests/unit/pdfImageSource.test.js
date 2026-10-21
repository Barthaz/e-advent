const { readPdfImage, normalizePdfImage, fetchRemoteImage, validateRemoteUrl, isPublicAddress, MAX_IMAGE_BYTES } = require('../../services/pdfImageSource');
const https = require('node:https');
const { EventEmitter } = require('node:events');

describe('PDF image source policy', () => {
  beforeEach(() => { process.env.PDF_IMAGE_ORIGINS = 'https://images.example.com'; });
  afterEach(() => { delete process.env.PDF_IMAGE_ORIGINS; jest.restoreAllMocks(); });
  test.each(['127.0.0.1', '10.1.2.3', '169.254.169.254', '172.16.1.1', '192.168.0.1', '::1', '::ffff:127.0.0.1', 'fe80::1', 'fc00::1', '2002:7f00:1::'])('blocks nonpublic destination %s', ip => {
    expect(isPublicAddress(ip)).toBe(false);
  });
  test.each(['8.8.8.8', '2606:4700:4700::1111'])('recognizes public destination %s', ip => {
    expect(isPublicAddress(ip)).toBe(true);
  });
  test.each(['http://images.example.com/a.png', 'https://images.example.com.evil.test/a.png', 'https://user:pass@images.example.com/a.png', 'https://127.0.0.1/a.png', 'file:///etc/passwd'])('rejects URL before making a request: %s', url => {
    expect(() => validateRemoteUrl(url)).toThrow();
  });
  test('accepts only the exact configured HTTPS origin', () => {
    expect(validateRemoteUrl('https://images.example.com/a.png').hostname).toBe('images.example.com');
  });
  test('does not treat a foreign /uploads path as a local upload', async () => {
    await expect(readPdfImage('https://attacker.test/uploads/secret.png')).rejects.toThrow();
  });
  test('limits data URI size before decoding', async () => {
    await expect(readPdfImage('data:image/png;base64,' + 'A'.repeat(MAX_IMAGE_BYTES * 2))).rejects.toThrow();
  });
  test('reads an inline image without network', async () => {
    await expect(readPdfImage('data:image/png;base64,aGVsbG8=')).resolves.toEqual(Buffer.from('hello'));
  });
  test('normalizes damaged PNG streams before the PDF library can crash', async () => {
    const damaged = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
    const { buffer } = await normalizePdfImage(damaged);
    const chunks = [];
    for (let offset = 8; offset + 12 <= buffer.length;) {
      const size = buffer.readUInt32BE(offset);
      if (buffer.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(buffer.subarray(offset + 8, offset + 8 + size));
      offset += size + 12;
    }
    expect(() => require('node:zlib').inflateSync(Buffer.concat(chunks))).not.toThrow();
  });
  test('rejects a decompression bomb before allocating a raster', async () => {
    const png = Buffer.alloc(24);
    Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
    png.write('IHDR', 12); png.writeUInt32BE(100000, 16); png.writeUInt32BE(100000, 20);
    await expect(normalizePdfImage(png)).rejects.toThrow();
  });
  test.each([302, 200])('rejects redirects or oversized downloads (%s)', async status => {
    jest.spyOn(https, 'get').mockImplementation((_url, _options, callback) => {
      const req = new EventEmitter();
      req.destroy = error => { req.emit('error', error); req.emit('close'); };
      process.nextTick(() => {
        const res = new EventEmitter();
        res.statusCode = status;
        res.headers = status === 302 ? { location: 'http://127.0.0.1/' } : {};
        res.destroy = () => {};
        callback(res);
        if (status === 200) res.emit('data', Buffer.alloc(MAX_IMAGE_BYTES + 1));
      });
      return req;
    });
    await expect(fetchRemoteImage('https://images.example.com/test.png')).rejects.toThrow();
    expect(https.get).toHaveBeenCalledTimes(1);
  });
});

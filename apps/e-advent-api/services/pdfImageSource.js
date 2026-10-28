'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const https = require('node:https');
const dns = require('node:dns');
const { BlockList, isIP } = require('node:net');
const { sniffImageFormat } = require('./imageFormat');

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const blocked = new BlockList();
for (const [ip, bits] of [ ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
  ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24],
  ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 3] ]) blocked.addSubnet(ip, bits, 'ipv4');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
blocked.addSubnet('2001::', 23, 'ipv6');
blocked.addSubnet('2001:db8::', 32, 'ipv6');
blocked.addSubnet('2002::', 16, 'ipv6');

function isPublicAddress(address) {
  const family = isIP(address);
  return family === 4 ? !blocked.check(address, 'ipv4')
    : family === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}

function imageError() {
  return Object.assign(new Error('Niedozwolone źródło lub zbyt duży plik grafiki PDF.'), { status: 422, code: 'PDF_IMAGE_REJECTED' });
}

function validateRemoteUrl(source) {
  const url = new URL(source);
  const origins = (process.env.PDF_IMAGE_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  // Exact deployment origins, never arbitrary URLs or a wildcard across Blob accounts.
  if (url.protocol !== 'https:' || url.username || url.password || url.port || isIP(url.hostname)
      || !origins.includes(url.origin)) throw imageError();
  return url;
}

function fetchRemoteImage(source) {
  const url = validateRemoteUrl(source);
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    // Validate and pin the DNS answer used by the socket (no DNS rebinding window).
    const req = https.get(url, {
      agent: false,
      lookup(hostname, options, callback) {
        dns.lookup(hostname, { all: true }, (err, addresses) => {
          if (err) return callback(err);
          if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) return callback(imageError());
          if (options.all) return callback(null, addresses);
          callback(null, addresses[0].address, addresses[0].family);
        });
      },
    }, res => {
      // Redirects are deliberately not followed.
      if (res.statusCode !== 200 || Number(res.headers['content-length']) > MAX_IMAGE_BYTES) {
        res.destroy();
        req.destroy(imageError());
        return;
      }
      res.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES) req.destroy(imageError());
        else chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    const timer = setTimeout(() => req.destroy(imageError()), 10000);
    req.on('error', reject);
    req.on('close', () => clearTimeout(timer));
  });
}

async function readPdfImage(source) {
  if (typeof source !== 'string' || !source.trim()) throw imageError();
  const src = source.trim();
  if (src.startsWith('data:')) {
    if (src.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 64) throw imageError();
    const match = /^data:image\/(?:png|jpeg);base64,([A-Za-z0-9+/=\s]+)$/.exec(src);
    if (!match) throw imageError();
    const bytes = Buffer.from(match[1], 'base64');
    if (bytes.length > MAX_IMAGE_BYTES) throw imageError();
    return bytes;
  }
  const apiOrigin = new URL(process.env.API_BASE_URL || 'http://localhost:3000').origin;
  const url = new URL(src, apiOrigin);
  if (url.origin === apiOrigin && /^\/uploads\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/i.test(url.pathname)) {
    const filename = path.join(__dirname, '..', 'uploads', path.basename(url.pathname));
    const file = await fs.open(filename, 'r');
    try {
      if ((await file.stat()).size > MAX_IMAGE_BYTES) throw imageError();
      return await file.readFile();
    } finally { await file.close(); }
  }
  return fetchRemoteImage(src);
}

function imageDimensions(buffer, format) {
  if (format === 'png' && buffer.length >= 24 && buffer.toString('ascii', 12, 16) === 'IHDR') {
    return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
  }
  if (format === 'jpeg') {
    let offset = 2;
    while (offset + 4 <= buffer.length) {
      if (buffer[offset++] !== 0xff) break;
      while (buffer[offset] === 0xff) offset++;
      const marker = buffer[offset++];
      if (marker === 0xda || marker === 0xd9 || offset + 2 > buffer.length) break;
      const length = buffer.readUInt16BE(offset);
      if (length < 2 || offset + length > buffer.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 8) {
        return [buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 3)];
      }
      offset += length;
    }
  }
  throw imageError();
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_RENDER_CHUNKS = new Set(['tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'pHYs', 'bKGD']);

/**
 * Drop metadata chunks from a PNG. @napi-rs/canvas cannot decode a PNG buffer that
 * carries e.g. a C2PA `caBX` chunk ("Invalid SVG image"); file paths decode fine.
 * @param {Buffer} buffer
 * @returns {Buffer}
 */
function stripPngMetadata(buffer) {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return buffer;
  const parts = [buffer.subarray(0, 8)];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const end = offset + 12 + buffer.readUInt32BE(offset);
    if (end > buffer.length) return buffer;
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    const critical = type[0] >= 'A' && type[0] <= 'Z';
    if (critical || PNG_RENDER_CHUNKS.has(type)) parts.push(buffer.subarray(offset, end));
    offset = end;
  }
  return parts.length > 1 ? Buffer.concat(parts) : buffer;
}

async function normalizePdfImage(buffer) {
  if (buffer.length > MAX_IMAGE_BYTES) throw imageError();
  const format = sniffImageFormat(buffer);
  const [width, height] = imageDimensions(buffer, format);
  if (!width || !height || width > 8192 || height > 8192 || width * height > 24_000_000) throw imageError();
  // Re-encode untrusted input: png-js in the PDF renderer can throw outside its
  // promise for corrupt IDAT data. Only canonical, decoded images reach it.
  const { loadImage, createCanvas } = require('@napi-rs/canvas');
  try {
    const image = await loadImage(format === 'png' ? stripPngMetadata(buffer) : buffer);
    const canvas = createCanvas(width, height);
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    return { buffer: canvas.toBuffer(format === 'jpeg' ? 'image/jpeg' : 'image/png'), format };
  } catch {
    throw imageError();
  }
}

module.exports = {
  readPdfImage,
  normalizePdfImage,
  fetchRemoteImage,
  validateRemoteUrl,
  isPublicAddress,
  stripPngMetadata,
  MAX_IMAGE_BYTES,
};

'use strict';

const BITRATES = {
  '1-1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  '1-2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  '1-3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  '2-1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  '2-2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  '2-3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 25: [11025, 12000, 8000] };

function id3Length(buf) {
  if (buf.length < 10 || buf.toString('latin1', 0, 3) !== 'ID3') return 0;
  const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
  const footer = buf[5] & 0x10 ? 10 : 0;
  return 10 + size + footer;
}

function parseFrameHeader(buf, offset) {
  if (offset + 4 > buf.length) return null;
  const b1 = buf[offset + 1];
  const b2 = buf[offset + 2];
  if (buf[offset] !== 0xff || (b1 & 0xe0) !== 0xe0) return null;
  const versionBits = (b1 >> 3) & 3;
  const layerBits = (b1 >> 1) & 3;
  if (versionBits === 1 || layerBits === 0) return null;
  const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : 25;
  const layer = 4 - layerBits;
  const bitrateIndex = b2 >> 4;
  const rateIndex = (b2 >> 2) & 3;
  if (bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
  const bitrate = BITRATES[`${version === 1 ? 1 : 2}-${layer}`][bitrateIndex] * 1000;
  const sampleRate = SAMPLE_RATES[version][rateIndex];
  const padding = (b2 >> 1) & 1;
  let samples;
  let length;
  if (layer === 1) {
    samples = 384;
    length = (Math.floor((12 * bitrate) / sampleRate) + padding) * 4;
  } else {
    samples = layer === 3 && version !== 1 ? 576 : 1152;
    length = Math.floor(((samples / 8) * bitrate) / sampleRate) + padding;
  }
  return { bitrate, sampleRate, samples, length };
}

/**
 * Walks MPEG audio frames to measure duration. Returns null when the buffer is not MP3.
 * @param {Buffer} buf
 * @returns {{ durationSeconds: number, frames: number, sampleRate: number } | null}
 */
function mp3Info(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 64) return null;
  let offset = id3Length(buf);
  let frames = 0;
  let seconds = 0;
  let sampleRate = 0;
  let misses = 0;
  while (offset < buf.length - 4) {
    const header = parseFrameHeader(buf, offset);
    if (!header || header.length < 4) {
      if (frames === 0 && offset > 8192 + id3Length(buf)) return null;
      offset += 1;
      misses += 1;
      if (frames > 0 && misses > 4096) break;
      continue;
    }
    misses = 0;
    frames += 1;
    seconds += header.samples / header.sampleRate;
    sampleRate = header.sampleRate;
    offset += header.length;
  }
  if (frames < 10) return null;
  return { durationSeconds: Math.round(seconds * 10) / 10, frames, sampleRate };
}

module.exports = { mp3Info };

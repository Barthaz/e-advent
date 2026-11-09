'use strict';
jest.mock('@aws-sdk/client-s3', () => {
  class Command { constructor(input) { this.input = input; } }
  return { S3Client: jest.fn(), GetObjectCommand: class Get extends Command {}, PutObjectCommand: class Put extends Command {}, DeleteObjectCommand: class Delete extends Command {} };
});
const { Readable } = require('node:stream');
const sdk = require('@aws-sdk/client-s3');
const r2 = require('../../services/santaMessages/r2');
const { saveAudio } = require('../../services/santaMessages/audioStore');
const { voiceConsentForCheckout } = require('../../services/santaMessages/consent');
const send = jest.fn();
const destroy = jest.fn();
const originalEnv = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, SANTA_AUDIO_STORAGE: 'r2', R2_ACCOUNT_ID: 'a'.repeat(32), R2_BUCKET_NAME: 'private-audio', R2_ACCESS_KEY_ID: 'test', R2_SECRET_ACCESS_KEY: 'test', R2_JURISDICTION: '' };
  sdk.S3Client.mockImplementation(() => ({ send, destroy }));
});
afterAll(() => { process.env = originalEnv; });

test('reads private R2 with server credentials and closes the response', async () => {
  const body = Readable.from([Buffer.from('mp3')]);
  send.mockResolvedValue({ Body: body, ContentLength: 3 });
  expect(await r2.readR2Audio('gotowe/123.mp3')).toEqual(Buffer.from('mp3'));
  expect(send.mock.calls[0][0].input).toEqual({ Bucket: 'private-audio', Key: 'gotowe/123.mp3' });
  expect(sdk.S3Client.mock.calls[0][0]).toMatchObject({ endpoint: `https://${'a'.repeat(32)}.r2.cloudflarestorage.com`, region: 'auto' });
  expect(destroy).toHaveBeenCalled();
});
test('uses the EU endpoint when selected', async () => {
  process.env.R2_JURISDICTION = 'eu';
  send.mockResolvedValue({});
  await r2.writeR2Audio('santa-messages/id/a.mp3', Buffer.from('mp3'));
  expect(sdk.S3Client.mock.calls[0][0].endpoint).toContain('.eu.r2.cloudflarestorage.com');
});
test.each(['https://evil.test/a.mp3', '../a.mp3', '/a.mp3', 'a\\b', '', 'a\n.mp3'])('rejects invalid object key %j without network access', async (key) => {
  await expect(r2.readR2Audio(key)).rejects.toMatchObject({ code: 'R2_INVALID_KEY', status: 400 });
  expect(send).not.toHaveBeenCalled();
});
test('bounds streamed data even if ContentLength is missing', async () => {
  send.mockResolvedValue({ Body: Readable.from([Buffer.alloc(r2.MAX_AUDIO_BYTES), Buffer.from('overflow')]) });
  await expect(r2.readR2Audio('file.mp3')).rejects.toMatchObject({ code: 'AUDIO_TOO_LARGE' });
  expect(destroy).toHaveBeenCalled();
});
test('returns null for missing objects, propagates permission failures', async () => {
  send.mockRejectedValueOnce(Object.assign(new Error(), { name: 'NoSuchKey' }));
  expect(await r2.readR2Audio('missing.mp3')).toBeNull();
  send.mockRejectedValueOnce(Object.assign(new Error(), { name: 'AccessDenied' }));
  await expect(r2.readR2Audio('private.mp3')).rejects.toMatchObject({ name: 'AccessDenied' });
});
test('writes a unique private managed copy and never requests public ACL', async () => {
  send.mockResolvedValue({});
  const key = await saveAudio('id', Buffer.from('mp3'));
  expect(key).toMatch(/^r2:santa-messages\/id\/.+\.mp3$/);
  expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: 'private-audio', CacheControl: 'private, no-store', ContentType: 'audio/mpeg' });
  expect(send.mock.calls[0][0].input.ACL).toBeUndefined();
});
test('missing credentials and production local storage fail closed', async () => {
  delete process.env.R2_SECRET_ACCESS_KEY;
  await expect(saveAudio('id', Buffer.from('mp3'))).rejects.toMatchObject({ code: 'R2_NOT_CONFIGURED' });
  process.env.NODE_ENV = 'production'; process.env.SANTA_AUDIO_STORAGE = 'local';
  await expect(saveAudio('id', Buffer.from('mp3'))).rejects.toThrow('Private R2 storage is required');
  expect(send).not.toHaveBeenCalled();
});
test('digital consent is required on commitment, not on preparing a payment', () => {
  const items = [{ sku: 'voice-message-addon' }, { sku: 'santa-letter' }];
  expect(voiceConsentForCheckout(items, {}, false)).toBeNull();
  expect(() => voiceConsentForCheckout(items, { termsAccepted: true }, true)).toThrow('Zaznacz zgodę');
  const receipt = voiceConsentForCheckout(items, { digitalContentConsent: true, acceptedAt: 'forged' }, true);
  expect(receipt.version).toBe('2026-11-06');
  expect(receipt.text).toContain('utracę prawo');
  expect(Number.isFinite(Date.parse(receipt.acceptedAt))).toBe(true);
  expect(voiceConsentForCheckout([{ sku: 'santa-letter' }], {}, true)).toBeNull();
});

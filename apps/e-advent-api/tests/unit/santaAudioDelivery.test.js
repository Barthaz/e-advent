'use strict';
jest.mock('../../config/database', () => ({ query: jest.fn(), withTransaction: jest.fn(async (fn) => fn()) }));
jest.mock('../../services/santaMessages/audioStore', () => ({ saveAudio: jest.fn(), readAudio: jest.fn(), deleteAudio: jest.fn().mockResolvedValue() }));
jest.mock('../../services/santaMessages/r2', () => ({ readR2Audio: jest.fn(), storageInfo: () => ({ provider: 'r2', r2Configured: true }) }));
jest.mock('../../services/santaMessages/emails', () => ({ deliverSantaEmail: jest.fn(), activationUrl: (token) => `https://e-advent.pl/activate/${token}`, playUrl: (token) => `https://e-advent.pl/od-mikolaja/${token}` }));
const request = require('supertest');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const db = require('../../config/database');
const audio = require('../../services/santaMessages/audioStore');
const r2 = require('../../services/santaMessages/r2');
const emails = require('../../services/santaMessages/emails');
const crypto = require('../../services/santaMessages/crypto');
const santa = require('../../services/santaMessages/fulfillment');
const router = require('../../routes/santaMessages');
const app = express().use('/santa-messages', router);
const id = '8b7b1f7e-3a3f-4c55-9a71-1c2d3e4f5a6b';
const sample = fs.readFileSync(path.join(__dirname, '../../../e-advent-frontend/public/assets/santa_sample.mp3'));
let instance, order, deliveries, orderItems;
beforeEach(() => {
  jest.clearAllMocks();
  process.env.SANTA_TOKEN_SECRET = 'test-only-secret-for-audio-link-12345678';
  process.env.SANTA_ADMIN_REVIEW_REQUIRED = 'true';
  instance = { id, order_id: 'o1', status: 'TTS_QUEUED', script_enc: crypto.encryptJson({ spokenText: 'Witaj, Zosiu!' }), script_approved_at: new Date(), play_token_version: 1, audio_key: null };
  order = { id: 'o1', status: 'succeeded', customer_email: 'test@example.com', order_number: 42 };
  deliveries = [];
  orderItems = [{ sku: 'voice-message' }];
  r2.readR2Audio.mockResolvedValue(sample);
  audio.saveAudio.mockResolvedValue('r2:santa-messages/id/snapshot.mp3');
  audio.readAudio.mockResolvedValue(sample);
  emails.deliverSantaEmail.mockResolvedValue({ subject: 'Gotowe' });
  db.query.mockImplementation(async (sql, params = []) => {
    if (sql.startsWith('SELECT * FROM santa_message_instances')) return [[{ ...instance }]];
    if (sql.startsWith('SELECT id, status, customer_email')) return [[{ ...order }]];
    if (sql.includes('SELECT COALESCE(MAX(version)')) return [[{ v: deliveries.length }]];
    if (sql.includes('INSERT IGNORE INTO santa_message_deliveries')) { deliveries.push({ id: params[0], message_id: id, delivery_type: params[2], attempts: 0 }); return [{ affectedRows: 1 }]; }
    if (sql.includes('SELECT d.id, d.message_id')) return [deliveries];
    if (sql.startsWith('SELECT sku FROM order_items')) return [orderItems];
    if (sql.includes('SET audio_key = ?')) {
      Object.assign(instance, { audio_key: params[0], audio_duration_seconds: params[1], audio_bytes: params[2], audio_source: params[3], status: params[4] });
    }
    if (sql.includes('delivered_at = COALESCE')) { instance.status = params[0]; instance.retention_until = params[1]; }
    if (sql.includes('SET play_token_version')) instance.play_token_version = params[0];
    return [{ affectedRows: 1 }];
  });
});
test('private R2 attachment → admin delivery → signed playback, seeking and MP3 download', async () => {
  await expect(santa.adminAttachR2Audio(id, 'gotowe/order42.mp3')).resolves.toMatchObject({ durationSeconds: expect.any(Number) });
  expect(instance.status).toBe('AUDIO_READY');
  expect(audio.saveAudio).toHaveBeenCalledWith(id, sample);
  expect(emails.deliverSantaEmail).not.toHaveBeenCalled();
  await expect(santa.audioForStreaming(id, 1)).resolves.toBeNull();
  await santa.deliverAudio(id);
  expect(instance.status).toBe('DELIVERED');
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining("SET o.fulfillment_status = 'delivered'"), ['o1', 'DELIVERED', 'CANCELLED', 'EXPIRED']);
  expect(emails.deliverSantaEmail.mock.calls[0][0].url).toMatch(/^https:\/\/e-advent.pl\/od-mikolaja\/[\w-]{43}$/);
  const view = await santa.playbackView(instance);
  expect(view.audioUrl).not.toContain('r2');
  const response = await request(app).get(view.audioUrl).set('Range', 'bytes=0-99');
  expect(response.status).toBe(206);
  expect(response.headers['content-range']).toBe(`bytes 0-99/${sample.length}`);
  expect(response.headers['cache-control']).toBe('private, no-store');
  const download = await request(app).get(view.downloadUrl);
  expect(download.status).toBe(200);
  expect(download.headers['content-disposition']).toContain('attachment');
  expect(download.headers['content-length']).toBe(String(sample.length));
});
test('revocation also invalidates already-issued audio URLs', async () => {
  Object.assign(instance, { status: 'DELIVERED', audio_key: 'r2:private.mp3' });
  const old = await santa.playbackView(instance);
  await santa.adminRevokePlayLink(id);
  expect(emails.deliverSantaEmail).toHaveBeenCalled();
  expect((await request(app).get(old.audioUrl)).status).toBe(404);
  const next = await santa.playbackView(instance);
  expect((await request(app).get(next.audioUrl)).status).toBe(200);
  expect((await request(app).get(next.audioUrl.replace('&v=2', '&v=1'))).status).toBe(403);
});
test.each(['CANCELLED', 'EXPIRED'])('stops serving %s messages after a successful playback', async (status) => {
  Object.assign(instance, { status: 'DELIVERED', audio_key: 'r2:private.mp3' });
  const view = await santa.playbackView(instance);
  expect((await request(app).get(view.audioUrl)).status).toBe(200);
  instance.status = status;
  expect((await request(app).get(view.audioUrl)).status).toBe(404);
});
test('retention expiry and reversed payment are checked on each audio request', async () => {
  Object.assign(instance, { status: 'DELIVERED', audio_key: 'r2:private.mp3', retention_until: new Date(Date.now() - 1000) });
  await expect(santa.audioForStreaming(id, 1)).resolves.toBeNull();
  instance.retention_until = null; order.status = 'canceled';
  await expect(santa.audioForStreaming(id, 1)).resolves.toBeNull();
  expect(audio.readAudio).not.toHaveBeenCalled();
});
test('requires payment before reading a private object', async () => {
  order.status = 'pending';
  await expect(santa.adminAttachR2Audio(id, 'a.mp3')).resolves.toEqual({ conflict: 'NOT_PAID' });
  expect(r2.readR2Audio).not.toHaveBeenCalled();
});
test('does not store non-MP3 data from R2', async () => {
  r2.readR2Audio.mockResolvedValue(Buffer.from('not an mp3'));
  await expect(santa.adminAttachR2Audio(id, 'a.mp3')).rejects.toMatchObject({ code: 'AUDIO_INVALID' });
  expect(audio.saveAudio).not.toHaveBeenCalled();
});
test('failed mail is queued and is not reported as delivered', async () => {
  instance.status = 'AUDIO_READY'; instance.audio_key = 'r2:a.mp3';
  emails.deliverSantaEmail.mockRejectedValue(new Error('SMTP unavailable'));
  const result = await santa.deliverAudio(id);
  expect(result.queued).toBe(true);
  expect(instance.status).toBe('AUDIO_READY');
});

'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { storageInfo, readR2Audio, writeR2Audio, deleteR2Audio, MAX_AUDIO_BYTES } = require('./r2');

/** Outside /uploads on purpose: that directory is served statically. */
const LOCAL_DIR = path.join(__dirname, '..', '..', 'storage', 'santa-audio');

/**
 * New production recordings always use private R2; local storage is for development.
 * Legacy Blob objects remain readable to avoid breaking already delivered messages.
 * @param {string} messageId
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function saveAudio(messageId, buffer) {
  if (buffer.length > MAX_AUDIO_BYTES) throw Object.assign(new Error('Plik jest za duży (maks. 4 MB).'), { status: 400, code: 'AUDIO_TOO_LARGE' });
  const name = `santa-messages/${messageId}/${Date.now()}-${randomBytes(12).toString('hex')}.mp3`;
  if (storageInfo().provider === 'r2') {
    await writeR2Audio(name, buffer);
    return `r2:${name}`;
  }
  if (storageInfo().provider !== 'local' || process.env.NODE_ENV === 'production') throw new Error('Private R2 storage is required in production');
  const file = path.join(LOCAL_DIR, name.replace(/\//g, '_'));
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(file, buffer);
  return `local:${path.basename(file)}`;
}

/** @returns {Promise<Buffer|null>} */
async function readAudio(key) {
  if (!key) return null;
  if (key.startsWith('r2:')) return readR2Audio(key.slice(3));
  if (key.startsWith('local:')) {
    const file = path.join(LOCAL_DIR, path.basename(key.slice('local:'.length)));
    try {
      return await fs.readFile(file);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }
  if (key.startsWith('blob:')) {
    const [, access, ...rest] = key.split(':');
    const url = rest.join(':');
    if (access === 'private') {
      const { get } = require('@vercel/blob');
      const result = await get(url, { access: 'private' });
      if (!result?.stream) return null;
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    }
    const response = await fetch(url);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Audio storage responded ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  return null;
}

async function deleteAudio(key) {
  if (!key) return;
  if (key.startsWith('r2:')) return deleteR2Audio(key.slice(3));
  if (key.startsWith('local:')) {
    await fs.rm(path.join(LOCAL_DIR, path.basename(key.slice('local:'.length))), { force: true });
    return;
  }
  if (key.startsWith('blob:')) {
    const { del } = require('@vercel/blob');
    await del(key.split(':').slice(2).join(':'));
  }
}

module.exports = { saveAudio, readAudio, deleteAudio, LOCAL_DIR };

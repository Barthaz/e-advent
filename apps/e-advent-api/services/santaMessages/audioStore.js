'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

/** Outside /uploads on purpose: that directory is served statically. */
const LOCAL_DIR = path.join(__dirname, '..', '..', 'storage', 'santa-audio');

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function blobAccess() {
  return process.env.SANTA_BLOB_ACCESS === 'private' ? 'private' : 'public';
}

/**
 * Stores an MP3 and returns an opaque storage key. With a public Blob store the
 * object name carries a random suffix and the URL never leaves the API.
 * @param {string} messageId
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function saveAudio(messageId, buffer) {
  const name = `santa-messages/${messageId}/${Date.now()}-${randomBytes(12).toString('hex')}.mp3`;
  if (useBlob()) {
    const { put } = require('@vercel/blob');
    const access = blobAccess();
    const blob = await put(name, buffer, {
      access,
      addRandomSuffix: true,
      contentType: 'audio/mpeg',
      cacheControlMaxAge: 60,
    });
    return `blob:${access}:${blob.url}`;
  }
  const file = path.join(LOCAL_DIR, name.replace(/\//g, '_'));
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(file, buffer);
  return `local:${path.basename(file)}`;
}

/** @returns {Promise<Buffer|null>} */
async function readAudio(key) {
  if (!key) return null;
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

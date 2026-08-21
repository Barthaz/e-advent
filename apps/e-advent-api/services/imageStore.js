'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { put } = require('@vercel/blob');
const {
  ALLOWED_MIME_TYPES,
  isAllowedUploadFile,
  uploadRejectMessage,
} = require('./imageFormat');

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (isAllowedUploadFile(file)) {
      cb(null, true);
    } else {
      cb(new Error(uploadRejectMessage(file)));
    }
  },
});

async function storeImage(buffer, originalName, mimetype, folder = 'designs') {
  const ext = path.extname(originalName) || '.jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
  const keyPrefix = String(folder || 'designs').replace(/[^a-z0-9/_-]/gi, '');

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${keyPrefix}/${filename}`, buffer, {
      access: 'public',
      contentType: mimetype,
    });
    return { imageUrl: blob.url, imageKey: blob.pathname };
  }

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  return {
    imageUrl: `${baseUrl}/uploads/${filename}`,
    imageKey: filename,
  };
}

module.exports = {
  imageUpload,
  storeImage,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES: [...ALLOWED_MIME_TYPES],
};

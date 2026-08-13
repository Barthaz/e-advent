const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { put } = require('@vercel/blob');
const Calendar = require('../models/Calendar');
const { uploadLimiter } = require('../middleware/rateLimits');

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Dozwolone formaty: JPG, PNG, WEBP'));
    }
  },
});

async function storeImage(buffer, originalName, mimetype) {
  const ext = path.extname(originalName) || '.jpg';
  const filename = `design-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`designs/${filename}`, buffer, {
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

router.post('/design', uploadLimiter, upload.single('image'), async (req, res) => {
  try {
    const calendarId = req.body?.calendarId || req.headers['x-calendar-id'];
    const editToken = req.body?.editToken || req.headers['x-calendar-edit-token'];

    if (!calendarId || !editToken) {
      return res.status(401).json({
        success: false,
        error: 'Wymagany calendarId oraz editToken',
      });
    }

    const calendar = await Calendar.findCalendarById(calendarId);
    if (!calendar || calendar.status !== 'pending') {
      return res.status(401).json({
        success: false,
        error: 'Nieprawidłowy kalendarz lub status',
      });
    }
    if (!Calendar.verifyEditToken(calendar, editToken)) {
      return res.status(401).json({
        success: false,
        error: 'Nieprawidłowy token edycji',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Brak pliku grafiki',
      });
    }

    const { buffer, originalname, mimetype } = req.file;
    const result = await storeImage(buffer, originalname, mimetype);

    console.log('✅ Design image uploaded:', result.imageUrl);

    res.json({
      success: true,
      imageUrl: result.imageUrl,
      imageKey: result.imageKey,
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Błąd podczas uploadu grafiki',
    });
  }
});

module.exports = router;

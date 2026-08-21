const express = require('express');
const Calendar = require('../models/Calendar');
const { uploadLimiter } = require('../middleware/rateLimits');
const { imageUpload, storeImage } = require('../services/imageStore');

const router = express.Router();

router.post('/design', uploadLimiter, imageUpload.single('image'), async (req, res) => {
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

const express = require('express');
const router = express.Router();
const { validatePromoCode } = require('../config/promocodes');
const { promocodeLimiter } = require('../middleware/rateLimits');

// GET /api/v1/promocodes/:code
router.get('/:code', promocodeLimiter, (req, res) => {
  try {
    const code = decodeURIComponent(req.params.code);
    console.log('🎟️ Sprawdzanie kodu promocyjnego:', code);

    const result = validatePromoCode(code);
    return res.json({
      success: true,
      valid: result.valid,
      discount: result.discount,
      message: result.message,
    });
  } catch (error) {
    console.error('❌ Błąd podczas walidacji kodu promocyjnego:', error);
    return res.status(500).json({
      success: false,
      valid: false,
      discount: 0,
      message: 'Wystąpił błąd podczas sprawdzania kodu promocyjnego.',
    });
  }
});

module.exports = router;

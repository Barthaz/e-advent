const express = require('express');
const router = express.Router();
const { validatePromoCode } = require('../config/promocodes');
const { promocodeLimiter } = require('../middleware/rateLimits');

// GET /api/v1/promocodes/:code
router.get('/:code', promocodeLimiter, async (req, res) => {
  try {
    const code = decodeURIComponent(req.params.code);
    const result = await validatePromoCode(code);
    return res.json({
      success: true,
      valid: result.valid,
      discount: result.discount,
      message: result.message,
    });
  } catch (error) {
    console.error('Promo code validation error:', error.message);
    return res.status(500).json({
      success: false,
      valid: false,
      discount: 0,
      message: 'Wystąpił błąd podczas sprawdzania kodu rabatowego.',
    });
  }
});

module.exports = router;

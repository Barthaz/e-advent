'use strict';

const { param, validationResult } = require('express-validator');
const { removeCertificate, removeOneLetter } = require('../services/orderLetterPack');

module.exports = (router, authAdmin) => {
  const sendError = (res, error) => {
    console.error('Admin order item error:', error);
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Nie udało się zmienić pozycji zamówienia.',
    });
  };

  router.delete('/orders/:id/items/:itemId', authAdmin, [
    param('id').isUUID().withMessage('Nieprawidłowy identyfikator zamówienia.'),
    param('itemId').isUUID().withMessage('Nieprawidłowy identyfikator pozycji.'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    try {
      res.json(await removeCertificate(req.params.id, req.params.itemId));
    } catch (error) {
      return sendError(res, error);
    }
  });

  router.post('/orders/:id/letter-pack/remove-letter', authAdmin, [
    param('id').isUUID().withMessage('Nieprawidłowy identyfikator zamówienia.'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    try {
      res.json(await removeOneLetter(req.params.id));
    } catch (error) {
      return sendError(res, error);
    }
  });
};

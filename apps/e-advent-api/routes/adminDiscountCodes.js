const { body, param, validationResult } = require('express-validator');
const { createCodes, listCodes, setActive } = require('../services/discountCodes');

function isNativeBoolean(value) {
  return value === true || value === false;
}

module.exports = (router, authAdmin) => {
  router.get('/discount-codes', authAdmin, async (req, res) => {
    try { res.json({ codes: await listCodes() }); }
    catch (error) {
      console.error('Admin list discount codes error:', error);
      res.status(500).json({ error: 'Nie udało się pobrać kodów rabatowych.' });
    }
  });

  router.post('/discount-codes', authAdmin, [
    body('percent').toInt().isIn([10, 20, 100]).withMessage('Rabat może wynosić 10%, 20% albo 100%.'),
    body('reusable').custom(isNativeBoolean).withMessage('Wybierz, czy kod jest wielorazowy.'),
    body('count').optional().toInt().isInt({ min: 1, max: 50 }).withMessage('Można wygenerować od 1 do 50 kodów.'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const created = await createCodes({
        percent: Number(req.body.percent),
        reusable: Boolean(req.body.reusable),
        count: req.body.count == null ? 1 : Number(req.body.count),
      });
      res.status(201).json({ codes: created });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : 'Nie udało się wygenerować kodów.' });
    }
  });

  router.patch('/discount-codes/:id', authAdmin, [
    param('id').isUUID().withMessage('Nieprawidłowy identyfikator kodu.'),
    body('active').custom(isNativeBoolean).withMessage('Podaj active: true albo false.'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      res.json({ code: await setActive(req.params.id, Boolean(req.body.active)) });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : 'Nie udało się zapisać kodu.' });
    }
  });
};

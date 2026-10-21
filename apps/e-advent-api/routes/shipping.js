const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const inpost = require('../services/inpost');
router.use(rateLimit({ windowMs: 60000, max: 60, standardHeaders: true, legacyHeaders: false }));
router.get('/config', (req, res) => {
  try {
    const c = inpost.config();
    res.json({ environment: c.environment, geowidgetToken: process.env.INPOST_GEOWIDGET_TOKEN || '' });
  } catch (e) { res.status(e.status || 503).json({ error: e.message }); }
});
router.post('/quote', (req, res) => {
  try {
    const q = inpost.quote(req.body.items, req.body.type);
    res.json({ price: q.price, currency: q.currency, profile: q.profile, quoteKey: q.quoteKey });
  } catch (e) { res.status(e.status || 503).json({ error: e.message }); }
});
module.exports = router;

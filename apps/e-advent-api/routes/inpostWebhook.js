const router = require('express').Router();
const { timingSafeEqual } = require('node:crypto');
const { query } = require('../config/database');
const { config } = require('../services/inpost');
const { advanceShipment } = require('../services/inpostFulfillment');
const limiter = require('../middleware/rateLimits').rateLimit({ windowMs: 60000, max: 300, standardHeaders: true, legacyHeaders: false });

router.post('/webhook', limiter, async (req, res) => {
  const secret = process.env.INPOST_WEBHOOK_SECRET;
  const token = req.query.token;
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) return res.status(503).json({ error: 'Webhook is not configured' });
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) return res.sendStatus(403);
  try {
    const c = config();
    if (!['shipment_confirmed', 'shipment_status_changed', 'offers_prepared'].includes(req.body.event)) return res.sendStatus(200);
    if (String(req.body.organization_id) !== c.organizationId || !/^\d{1,20}$/.test(String(req.body.payload?.shipment_id || ''))) return res.sendStatus(400);
    const [rows] = await query('SELECT order_id FROM order_inpost_shipments WHERE environment = ? AND organization_id = ? AND shipment_id = ?',
      [c.environment, c.organizationId, String(req.body.payload.shipment_id)]);
    // A webhook is only a hint. Fetch the shipment with our own credentials;
    // never trust its customer, tracking number, status or price from the body.
    if (rows[0]) await advanceShipment(rows[0].order_id);
    return res.sendStatus(200);
  } catch { return res.sendStatus(503); }
});
module.exports = router;

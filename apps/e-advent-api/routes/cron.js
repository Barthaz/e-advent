const express = require('express');
const router = express.Router();
const authCron = require('../middleware/authCron');
const { sendTodaysDailyWindows } = require('../services/orderMailer');
const { retryOrderEmails } = require('../services/orderEmailJobs');
const { syncActiveShipments } = require('../services/inpostFulfillment');

async function handleOrderEmails(req, res) {
  try { res.json({ success: true, ...await retryOrderEmails() }); }
  catch { res.status(500).json({ error: 'Order email retry failed' }); }
}
router.get('/order-emails', authCron, handleOrderEmails);
router.post('/order-emails', authCron, handleOrderEmails);

async function handleInpostStatus(req, res) {
  try {
    res.json({ success: true, ...await syncActiveShipments() });
  } catch { res.status(500).json({ error: 'InPost status sync failed' }); }
}
router.get('/inpost-status', authCron, handleInpostStatus);
router.post('/inpost-status', authCron, handleInpostStatus);

// Vercel: 07:00 UTC = 8:00 Europe/Warsaw in December (CET). Also retries paid
// emails and refreshes InPost status (does not buy labels). Window mails go
// only to email-opening calendars whose today task is still closed.
async function handleDailyWindows(req, res) {
  try {
    await retryOrderEmails();
    await syncActiveShipments().catch((error) => console.error('Cron InPost sync error:', error.message));
    const result = await sendTodaysDailyWindows({ force: false, triggeredBy: 'cron' });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Cron daily windows error:', error);
    res.status(500).json({ error: 'Failed to send daily windows', message: error.message });
  }
}

router.get('/daily-windows', authCron, handleDailyWindows);
router.post('/daily-windows', authCron, handleDailyWindows);

module.exports = router;

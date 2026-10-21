const express = require('express');
const router = express.Router();
const authCron = require('../middleware/authCron');
const { sendTodaysDailyWindows } = require('../services/orderMailer');
const { retryOrderEmails } = require('../services/orderEmailJobs');

async function handleOrderEmails(req, res) {
  try { res.json({ success: true, ...await retryOrderEmails() }); }
  catch { res.status(500).json({ error: 'Order email retry failed' }); }
}
router.get('/order-emails', authCron, handleOrderEmails);
router.post('/order-emails', authCron, handleOrderEmails);

async function handleDailyWindows(req, res) {
  try {
    await retryOrderEmails();
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

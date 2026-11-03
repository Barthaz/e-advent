const express = require('express');
const router = express.Router();
const authCron = require('../middleware/authCron');
const { sendTodaysDailyWindows } = require('../services/orderMailer');
const { retryOrderEmails } = require('../services/orderEmailJobs');
const { syncActiveShipments, createMissingShipments } = require('../services/inpostFulfillment');
const { cleanupExportBlobs } = require('../services/blobExportCleanup');

async function handleOrderEmails(req, res) {
  try { res.json({ success: true, ...await retryOrderEmails() }); }
  catch { res.status(500).json({ error: 'Order email retry failed' }); }
}
router.get('/order-emails', authCron, handleOrderEmails);
router.post('/order-emails', authCron, handleOrderEmails);

async function handleInpostStatus(req, res) {
  try {
    const missing = await createMissingShipments();
    res.json({ success: true, ...await syncActiveShipments(), missing });
  } catch { res.status(500).json({ error: 'InPost status sync failed' }); }
}
router.get('/inpost-status', authCron, handleInpostStatus);
router.post('/inpost-status', authCron, handleInpostStatus);

// Vercel: 07:00 UTC = 8:00 Europe/Warsaw in December (CET). Also retries paid
// emails, creates missing InPost shipments (does not buy labels) and deletes
// parked admin exports from Blob. Window mails go only to email-opening
// calendars whose today task is still closed.
async function handleDailyWindows(req, res) {
  try {
    await retryOrderEmails();
    await createMissingShipments().catch((error) => console.error('Cron InPost create error:', error.message));
    await syncActiveShipments().catch((error) => console.error('Cron InPost sync error:', error.message));
    const exportCleanup = await cleanupExportBlobs().catch((error) => {
      console.error('Cron export blob cleanup error:', error.message);
      return { error: error.message };
    });
    const result = await sendTodaysDailyWindows({ force: false, triggeredBy: 'cron' });
    res.json({ success: true, ...result, exportCleanup });
  } catch (error) {
    console.error('Cron daily windows error:', error);
    res.status(500).json({ error: 'Failed to send daily windows', message: error.message });
  }
}

async function handleExportCleanup(req, res) {
  try { res.json({ success: true, ...await cleanupExportBlobs() }); }
  catch (error) {
    console.error('Cron export blob cleanup error:', error.message);
    res.status(500).json({ error: 'Export blob cleanup failed' });
  }
}
router.get('/export-cleanup', authCron, handleExportCleanup);
router.post('/export-cleanup', authCron, handleExportCleanup);

router.get('/daily-windows', authCron, handleDailyWindows);
router.post('/daily-windows', authCron, handleDailyWindows);

module.exports = router;

'use strict';
const { query, withNamedLocks } = require('../config/database');
const Payment = require('../models/Payment');
const { sendPaidOrderEmails } = require('./orderMailer');

async function deliverOrderEmails(orderId) {
  return withNamedLocks([`order-email:${orderId}`], async () => {
    const [jobs] = await query('SELECT status FROM order_email_jobs WHERE order_id = ?', [orderId]);
    if (!jobs.length) throw new Error('Order email job not found');
    if (jobs[0].status === 'sent') return { sent: 0, failed: 0 };
    try {
      const order = await Payment.findPaymentById(orderId);
      const result = await sendPaidOrderEmails(order, 'webhook');
      if (result.failed) throw new Error('Order email delivery failed');
      await query("UPDATE order_email_jobs SET status = 'sent', attempts = attempts + 1, last_error = NULL WHERE order_id = ?", [orderId]);
      return result;
    } catch (error) {
      await query("UPDATE order_email_jobs SET attempts = attempts + 1, last_error = ?, next_attempt_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE) WHERE order_id = ?", [String(error.message).slice(0, 500), orderId]);
      throw error;
    }
  });
}

async function retryOrderEmails() {
  const [jobs] = await query("SELECT order_id FROM order_email_jobs WHERE status = 'pending' AND next_attempt_at <= UTC_TIMESTAMP() ORDER BY next_attempt_at LIMIT 20");
  let delivered = 0, failed = 0;
  for (const job of jobs) {
    try { await deliverOrderEmails(job.order_id); delivered++; }
    catch { failed++; }
  }
  return { delivered, failed };
}
module.exports = { deliverOrderEmails, retryOrderEmails };

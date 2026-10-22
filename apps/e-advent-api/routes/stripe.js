const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const Payment = require('../models/Payment');
const { fulfillPaidIntent } = require('../services/paymentFulfillment');
const { body, validationResult } = require('express-validator');
const { initializeCheckout } = require('../services/checkoutPayment');
const { deliverOrderEmails } = require('../services/orderEmailJobs');
const { timingSafeEqual } = require('node:crypto');
const { query } = require('../config/database');


function extractRequestData(body) {
    let requestData = body;
    if (body.data && typeof body.data === 'object') {
        if (body.data.amount || body.data.customerEmail || body.data.orderId || body.data.items || body.data.productId) {
            requestData = {
                amount: body.data.amount,
                currency: body.data.currency || 'pln',
                customerEmail: body.data.customerEmail,
                orderId: body.data.orderId,
                checkoutToken: body.data.checkoutToken,
                metadata: body.data.metadata || {},
                productId: body.data.productId,
                editToken: body.data.editToken,
                items: body.data.items,
                delivery: body.data.delivery,
                shippingAddress: body.data.shippingAddress || body.data.metadata?.shippingAddress,
            };
        }
    }
    return requestData;
}

// Create payment intent (supports cart items[] + legacy productId)
router.post('/create-payment-intent', async (req, res) => {
    try {
        const requestData = extractRequestData(req.body);
        const errors = [];

        if (!requestData.amount && requestData.amount !== 0) {
            errors.push({ type: 'field', msg: 'Amount is required', path: 'amount', location: 'body' });
        } else {
            const amount = Number(requestData.amount);
            if (isNaN(amount) || amount <= 0) {
                errors.push({ type: 'field', msg: 'Amount must be a positive number', path: 'amount', location: 'body' });
            }
        }

        if ((requestData.currency || 'pln').toLowerCase() !== 'pln') {
            errors.push({ type: 'field', msg: 'Only PLN currency is supported', path: 'currency', location: 'body' });
        }

        if (!requestData.customerEmail) {
            errors.push({ type: 'field', msg: 'Valid email is required', path: 'customerEmail', location: 'body' });
        } else {
            const email = String(requestData.customerEmail).trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errors.push({ type: 'field', msg: 'Valid email is required', path: 'customerEmail', location: 'body' });
            }
        }

        if (!requestData.orderId || String(requestData.orderId).trim().length === 0) {
            errors.push({ type: 'field', msg: 'OrderId is required', path: 'orderId', location: 'body' });
        }

        if (!requestData.productId && !(Array.isArray(requestData.items) && requestData.items.length > 0)) {
            errors.push({ type: 'field', msg: 'ProductId is required', path: 'productId', location: 'body' });
        }

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in .env file.' });
        }

        const result = await initializeCheckout(requestData, req.ip || 'unknown');
        res.json(result);
    } catch (error) {
        console.error('❌ Unexpected error creating payment intent:', error);
        res.status(error.status || 503).json({ error: 'Checkout could not be prepared', message: error.status ? error.message : 'Nie udało się zapisać płatności. Spróbuj ponownie.', ...(error.errors ? { errors: error.errors } : {}) });
    }
});

function hasPaymentAccess(req, intent) {
    const token = req.headers['x-payment-client-secret'] || req.body?.clientSecret;
    if (typeof token !== 'string' || typeof intent.client_secret !== 'string') return false;
    const actual = Buffer.from(token), expected = Buffer.from(intent.client_secret);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Confirm payment
router.post('/confirm-payment', [
    body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { paymentIntentId } = req.body;

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (!hasPaymentAccess(req, paymentIntent)) return res.status(403).json({ error: 'Forbidden' });
        // Only a verified webhook may activate a paid order.

        res.json({
            status: paymentIntent.status,
            payment: { id: paymentIntent.id, status: paymentIntent.status },
        });
    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get payment status
router.get('/payment/:paymentIntentId', async (req, res) => {
    try {
        const { paymentIntentId } = req.params;

        const payment = await Payment.findPaymentByStripeId(paymentIntentId);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (!hasPaymentAccess(req, paymentIntent)) return res.status(403).json({ error: 'Forbidden' });
        if (payment.metadata?.checkoutVersion === 2 && (paymentIntent.metadata?.orderId !== payment.id
            || paymentIntent.metadata?.customerEmail !== payment.customerEmail
            || paymentIntent.metadata?.checkoutFingerprint !== payment.metadata.checkoutFingerprint)) {
            throw new Error('Payment order identity mismatch');
        }
        const [jobs] = await query('SELECT status FROM order_email_jobs WHERE order_id = ?', [payment.id]);
        const { metadata, clientIP, fulfillmentNotes, ...publicPayment } = payment;
        res.json({
            payment: publicPayment,
            stripeStatus: paymentIntent.status,
            emailStatus: jobs[0]?.status || 'pending',
        });
    } catch (error) {
        console.error('Error retrieving payment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Webhook endpoint for Stripe events.
// Raw bytes come from app.js bodyParser verify= (req.rawBody). Do not use
// express.raw() here — after json parsing the stream is empty and it overwrites body.
router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const payload = Buffer.isBuffer(req.rawBody) ? req.rawBody : null;
    let event;

    try {
        if (!payload) {
            throw new Error('Missing raw webhook body (Vercel/body-parser)');
        }
        event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message, {
            hasRawBody: Buffer.isBuffer(req.rawBody),
            bodyType: Buffer.isBuffer(req.body) ? 'buffer' : typeof req.body,
            secretPrefix: String(process.env.STRIPE_WEBHOOK_SECRET || '').slice(0, 10),
        });
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === 'payment_intent.succeeded') {
            const result = await fulfillPaidIntent(event.data.object);
            await deliverOrderEmails(result.orderId);
        } else if (['payment_intent.payment_failed', 'payment_intent.canceled'].includes(event.type)) {
            // A delayed failed event must not reserve a second payment or undo
            // a later successful retry of this same PaymentIntent.
            const current = await stripe.paymentIntents.retrieve(event.data.object.id);
            if (current.status === 'canceled') await Payment.updatePaymentStatus(current.id, 'canceled');
        }
    } catch (error) {
        console.error('Webhook processing failed:', event.id, error.message);
        return res.status(500).json({ error: 'Webhook processing failed; retry required' });
    }

    res.json({ received: true });
});

module.exports = router;

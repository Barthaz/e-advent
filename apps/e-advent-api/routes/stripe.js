const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const Payment = require('../models/Payment');
const Calendar = require('../models/Calendar');
const { body, validationResult } = require('express-validator');
const { getProductPrice, isPhysicalProduct, computeOrderTotals } = require('../config/products');
const { resolveCheckoutItems } = require('../services/orderCheckout');
const { generateAccessCode, sendPaidOrderEmails } = require('../services/orderMailer');
const { formatOrderNumber } = require('../utils/orderNumber');

function extractRequestData(body) {
    let requestData = body;
    if (body.data && typeof body.data === 'object') {
        if (body.data.amount || body.data.customerEmail || body.data.orderId || body.data.items || body.data.productId) {
            requestData = {
                amount: body.data.amount,
                currency: body.data.currency || 'pln',
                customerEmail: body.data.customerEmail,
                orderId: body.data.orderId,
                metadata: body.data.metadata || {},
                productId: body.data.productId,
                items: body.data.items,
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

        let customerEmail = String(requestData.customerEmail).trim().toLowerCase();
        let orderId = String(requestData.orderId).trim();
        let currency = String(requestData.currency || 'pln').toLowerCase();
        let metadata = requestData.metadata || {};

        const resolved = await resolveCheckoutItems(requestData);
        if (resolved.errors) {
            const first = resolved.errors[0];
            if (first?.msg?.includes('Calendar not found')) {
                return res.status(404).json({ error: 'Calendar not found', message: first.msg, errors: resolved.errors });
            }
            if (first?.currentStatus) {
                return res.status(400).json({
                    error: 'Invalid calendar status',
                    message: first.msg,
                    currentStatus: first.currentStatus,
                    errors: resolved.errors,
                });
            }
            return res.status(400).json({ errors: resolved.errors });
        }

        const { items, totals, shippingAddress, primaryProductId, primarySku, primaryProductType, hasPhysical } = resolved;
        const expectedAmount = totals.total;
        let amount = Number(requestData.amount);

        if (amount !== expectedAmount) {
            return res.status(400).json({
                errors: [{
                    type: 'field',
                    msg: `Amount must be exactly ${expectedAmount} PLN for this order. Received: ${amount} PLN`,
                    path: 'amount',
                    location: 'body',
                }],
            });
        }

        amount = expectedAmount;
        metadata = {
            ...metadata,
            sku: primarySku,
            productType: primaryProductType,
            itemCount: String(items.length),
            shippingAmount: String(totals.shipping),
            subtotal: String(totals.subtotal),
            freeShipping: totals.freeShipping ? '1' : '0',
            shippingAddress: shippingAddress || undefined,
        };

        const clientIP = req.ip
            || req.connection?.remoteAddress
            || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.headers['x-real-ip']
            || 'unknown';

        let existingPayment = null;
        const calendarIds = [
            primaryProductId,
            ...items.map((item) => item.calendarId).filter(Boolean),
        ].filter((id, index, arr) => id && arr.indexOf(id) === index);

        for (const calendarId of calendarIds) {
            const existingPayments = await Payment.findPayments(
                { productId: calendarId, status: 'pending' },
                { limit: 1 }
            );
            if (existingPayments && existingPayments.length > 0) {
                existingPayment = existingPayments[0];
                break;
            }
        }

        // Letter-only / no calendar: reuse recent pending by email + amount
        if (!existingPayment && !primaryProductId && customerEmail) {
            const byEmail = await Payment.findPayments(
                { customerEmail, status: 'pending' },
                { limit: 5 }
            );
            existingPayment = (byEmail || []).find((p) => {
                const sameAmount = Number(p.amount) === Number(amount);
                const createdAt = p.createdAt ? new Date(p.createdAt).getTime() : 0;
                const fresh = Date.now() - createdAt < 60 * 60 * 1000;
                return sameAmount && fresh;
            }) || null;
        }

        const stripeMetadata = {
            customerEmail,
            orderId,
            productId: primaryProductId || '',
            clientIP,
            sku: primarySku,
            productType: primaryProductType,
            itemCount: String(items.length),
        };

        let paymentIntent;
        let isUpdate = false;

        if (existingPayment?.stripePaymentIntentId) {
            try {
                paymentIntent = await stripe.paymentIntents.retrieve(existingPayment.stripePaymentIntentId);
                paymentIntent = await stripe.paymentIntents.update(existingPayment.stripePaymentIntentId, {
                    amount: Math.round(amount * 100),
                    metadata: stripeMetadata,
                });
                isUpdate = true;
            } catch (stripeError) {
                if (stripeError.code === 'resource_missing' || stripeError.statusCode === 404) {
                    paymentIntent = await stripe.paymentIntents.create({
                        amount: Math.round(amount * 100),
                        currency,
                        automatic_payment_methods: { enabled: true },
                        metadata: stripeMetadata,
                    });
                    isUpdate = true; // keep updating the same DB row
                } else {
                    return res.status(500).json({
                        error: 'Failed to retrieve or update payment intent in Stripe',
                        details: stripeError.message,
                        code: stripeError.code,
                    });
                }
            }
        } else if (existingPayment) {
            // Pending order exists without Stripe PI — create PI and update the same row
            try {
                paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(amount * 100),
                    currency,
                    automatic_payment_methods: { enabled: true },
                    metadata: stripeMetadata,
                });
                isUpdate = true;
            } catch (stripeError) {
                return res.status(500).json({
                    error: 'Failed to create payment intent in Stripe',
                    details: stripeError.message,
                    code: stripeError.code,
                });
            }
        } else {
            try {
                paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(amount * 100),
                    currency,
                    automatic_payment_methods: { enabled: true },
                    metadata: stripeMetadata,
                });
            } catch (stripeError) {
                return res.status(500).json({
                    error: 'Failed to create payment intent in Stripe',
                    details: stripeError.message,
                    code: stripeError.code,
                });
            }
        }

        const metadataWithIP = { ...metadata, clientIP, clientOrderId: orderId };
        const orderItemsPayload = items.map((item, index) => {
            const line = totals.lines?.[index];
            return {
                sku: item.sku,
                productType: item.productType,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                vatRate: line?.vatRate ?? totals.vatRate,
                unitPriceNetto: line?.unitPriceNetto,
                lineNetto: line?.lineNetto,
                lineVat: line?.lineVat,
                lineBrutto: line?.lineBrutto,
                calendarId: item.calendarId,
                requiresShipping: item.requiresShipping,
                ...(item.metadata ? { metadata: item.metadata } : {}),
            };
        });

        let savedOrder = null;
        try {
            // Race guard: another parallel request may have inserted while we created Stripe PI
            if (!isUpdate && calendarIds.length > 0) {
                for (const calendarId of calendarIds) {
                    const racePayments = await Payment.findPayments(
                        { productId: calendarId, status: 'pending' },
                        { limit: 1 }
                    );
                    if (racePayments && racePayments.length > 0) {
                        existingPayment = racePayments[0];
                        isUpdate = true;
                        break;
                    }
                }
            }

            if (isUpdate && existingPayment) {
                const keptStripeId = existingPayment.stripePaymentIntentId;
                // Lost race: we created a new Stripe PI but DB row already exists — keep the existing PI
                if (keptStripeId && keptStripeId !== paymentIntent.id) {
                    try {
                        await stripe.paymentIntents.cancel(paymentIntent.id);
                    } catch (cancelErr) {
                        console.warn('⚠️ Could not cancel orphaned payment intent:', cancelErr.message);
                    }
                    try {
                        paymentIntent = await stripe.paymentIntents.update(keptStripeId, {
                            amount: Math.round(amount * 100),
                            metadata: stripeMetadata,
                        });
                    } catch (updateErr) {
                        paymentIntent = await stripe.paymentIntents.retrieve(keptStripeId);
                    }
                }

                savedOrder = await Payment.updatePayment(paymentIntent.id, {
                    stripePaymentIntentId: paymentIntent.id,
                    amount,
                    shippingAmount: totals.shipping,
                    amountNetto: totals.amountNetto,
                    vatAmount: totals.vatAmount,
                    shippingNetto: totals.shippingNetto,
                    shippingVat: totals.shippingVat,
                    vatRate: totals.vatRate,
                    currency,
                    status: 'pending',
                    customerEmail,
                    metadata: metadataWithIP,
                    productType: primaryProductType,
                    sku: primarySku,
                    shippingAddress,
                    fulfillmentStatus: 'pending',
                    ...(primaryProductId ? { productId: primaryProductId } : {}),
                });
                if (Payment.replaceOrderItems && existingPayment.id) {
                    await Payment.replaceOrderItems(existingPayment.id, orderItemsPayload);
                }
            } else {
                savedOrder = await Payment.createPayment({
                    stripePaymentIntentId: paymentIntent.id,
                    amount,
                    shippingAmount: totals.shipping,
                    amountNetto: totals.amountNetto,
                    vatAmount: totals.vatAmount,
                    shippingNetto: totals.shippingNetto,
                    shippingVat: totals.shippingVat,
                    vatRate: totals.vatRate,
                    currency,
                    status: 'pending',
                    customerEmail,
                    metadata: metadataWithIP,
                    orderId,
                    productId: primaryProductId,
                    productType: primaryProductType,
                    sku: primarySku,
                    shippingAddress,
                    fulfillmentStatus: 'pending',
                    hasPhysical,
                    items: orderItemsPayload,
                });
            }
        } catch (dbError) {
            console.error('❌ Database Error:', dbError);
            console.warn('⚠️ Payment Intent processed in Stripe but failed to save/update in database');
        }

        if (!savedOrder) {
            savedOrder = await Payment.findPaymentByStripeId(paymentIntent.id);
        }

        const orderNumberDisplay = savedOrder?.orderNumberDisplay
            || formatOrderNumber(savedOrder?.orderNumber)
            || null;

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            productId: primaryProductId,
            orderId,
            orderNumber: orderNumberDisplay,
            amount,
            shipping: totals.shipping,
            subtotal: totals.subtotal,
            items: orderItemsPayload.map(({ sku, productType, quantity, unitPrice, calendarId, metadata }) => ({
                sku, productType, quantity, unitPrice, calendarId,
                ...(metadata ? { metadata } : {}),
            })),
        });
    } catch (error) {
        console.error('❌ Unexpected error creating payment intent:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

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

        // Update payment status in database
        await Payment.updatePaymentStatus(paymentIntentId, paymentIntent.status);

        res.json({
            status: paymentIntent.status,
            payment: paymentIntent,
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

        res.json({
            payment: payment,
            stripeStatus: paymentIntent.status,
        });
    } catch (error) {
        console.error('Error retrieving payment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Webhook endpoint for Stripe events
// WAŻNE: express.raw() musi być użyte tutaj, aby otrzymać surowe body (Buffer)
// Stripe wymaga surowego body do weryfikacji podpisu webhooka
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntentSucceeded = event.data.object;
            const paymentIntentId = paymentIntentSucceeded.id;

            console.log('🎉 ============================================');
            console.log('🎉 WEBHOOK: payment_intent.succeeded');
            console.log('🎉 ============================================');
            console.log('📥 Payment Intent ID:', paymentIntentId);
            console.log('📥 Payment Intent Amount:', paymentIntentSucceeded.amount);
            console.log('📥 Payment Intent Currency:', paymentIntentSucceeded.currency);
            console.log('📥 Payment Intent Status:', paymentIntentSucceeded.status);

            try {
                // Pobierz payment z bazy danych (przed aktualizacją, aby sprawdzić metadata)
                let payment = await Payment.findPaymentByStripeId(paymentIntentId);

                // Pobierz IP użytkownika - najpierw sprawdź czy jest w metadata paymentu
                // (jeśli było zapisane przy tworzeniu payment intent)
                let clientIP = payment?.metadata?.clientIP
                    || payment?.metadata?.userIP
                    || paymentIntentSucceeded.metadata?.clientIP
                    || paymentIntentSucceeded.metadata?.userIP
                    || req.ip
                    || req.connection?.remoteAddress
                    || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                    || req.headers['x-real-ip']
                    || 'unknown';

                // Data i godzina akceptacji (aktualna data w momencie pomyślnej płatności)
                const acceptanceDate = new Date();

                console.log('📥 IP użytkownika:', clientIP);
                console.log('📅 Data akceptacji regulaminu i polityki prywatności:', acceptanceDate.toISOString());

                // Aktualizuj status płatności w bazie wraz z informacjami o akceptacji
                await Payment.updatePayment(paymentIntentId, {
                    status: 'succeeded',
                    termsAcceptedAt: acceptanceDate,
                    privacyPolicyAcceptedAt: acceptanceDate,
                    clientIP: clientIP,
                });
                console.log('✅ Status płatności zaktualizowany w bazie danych wraz z informacjami o akceptacji');

                // Pobierz zaktualizowany payment z bazy danych
                payment = await Payment.findPaymentByStripeId(paymentIntentId);

                if (!payment) {
                    console.error('❌ Nie znaleziono paymentu w bazie danych dla Payment Intent ID:', paymentIntentId);
                    break;
                }

                console.log('📋 Znaleziony payment w bazie:', {
                    paymentId: payment._id,
                    productId: payment.productId,
                    customerEmail: payment.customerEmail,
                    orderId: payment.orderId,
                    amount: payment.amount,
                    currency: payment.currency,
                    termsAcceptedAt: payment.termsAcceptedAt,
                    privacyPolicyAcceptedAt: payment.privacyPolicyAcceptedAt,
                    clientIP: payment.clientIP,
                });

                // Resolve line items (cart) or legacy single calendar
                let lineItems = Array.isArray(payment.items) && payment.items.length > 0
                    ? payment.items
                    : null;

                if (!lineItems) {
                    if (!payment.productId && payment.sku !== 'santa-letter') {
                        console.error('❌ Payment nie ma pozycji ani productId');
                        break;
                    }
                    lineItems = [{
                        sku: payment.sku || 'interactive',
                        productType: payment.productType || 'interactive',
                        quantity: 1,
                        unitPrice: null,
                        calendarId: payment.productId || null,
                    }];
                }

                const totalsCheck = computeOrderTotals(
                    lineItems.map((i) => ({ sku: i.sku, quantity: i.quantity || 1 }))
                );
                const expectedUnlockAmount = totalsCheck ? totalsCheck.total : getProductPrice(payment.sku);
                const paidAmount = Number(payment.amount);
                const stripeAmountPln = paymentIntentSucceeded.amount != null
                    ? Number(paymentIntentSucceeded.amount) / 100
                    : paidAmount;

                if (
                    expectedUnlockAmount === null
                    || paidAmount !== expectedUnlockAmount
                    || stripeAmountPln !== expectedUnlockAmount
                ) {
                    console.error('❌ WEBHOOK amount mismatch — refusing to unlock', {
                        expectedUnlockAmount,
                        paidAmount,
                        stripeAmountPln,
                        items: lineItems,
                    });
                    break;
                }

                const hasPhysical = lineItems.some((i) => isPhysicalProduct(i.sku));

                for (const item of lineItems) {
                    const physical = isPhysicalProduct(item.sku);
                    if (item.calendarId) {
                        const calendar = await Calendar.findCalendarById(item.calendarId);
                        if (!calendar) {
                            console.error('❌ Brak kalendarza dla item', item);
                            continue;
                        }
                        if (physical) {
                            await Calendar.updateCalendar(item.calendarId, {
                                status: 'succeeded',
                                fulfillmentStatus: 'pending',
                            });
                        } else {
                            const accessCode = generateAccessCode();
                            await Calendar.updateCalendar(item.calendarId, {
                                status: 'succeeded',
                                accessCode,
                                fulfillmentStatus: 'delivered',
                            });
                        }
                    }
                }

                await Payment.updatePayment(paymentIntentId, {
                    fulfillmentStatus: hasPhysical ? 'pending' : 'delivered',
                    deliveryType: hasPhysical ? (payment.deliveryType || 'poczta_polska') : 'none',
                });

                payment = await Payment.findPaymentByStripeId(paymentIntentId);
                try {
                    const mailResult = await sendPaidOrderEmails(payment, 'webhook');
                    console.log('✅ Paid-order emails:', mailResult);
                } catch (mailErr) {
                    console.error('❌ Paid-order emails failed:', mailErr.message);
                }

                console.log('🎉 WEBHOOK: payment_intent.succeeded - ZAKOŃCZONY');

            } catch (error) {
                console.error('❌ Błąd podczas przetwarzania webhooka payment_intent.succeeded:', error);
                console.error('❌ Stack trace:', error.stack);
                // Nie przerywamy - zwracamy 200, żeby Stripe nie próbował ponownie
                // (możemy przetworzyć to później ręcznie)
            }
            break;

        case 'payment_intent.payment_failed':
            const paymentIntentFailed = event.data.object;
            await Payment.updatePaymentStatus(paymentIntentFailed.id, 'failed');
            console.log('❌ Payment failed:', paymentIntentFailed.id);
            break;

        default:
            console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

module.exports = router;

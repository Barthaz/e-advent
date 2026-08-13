const express = require('express');
const router = express.Router();
const { body, validationResult, query: qv } = require('express-validator');
const AdminUser = require('../models/AdminUser');
const authAdmin = require('../middleware/authAdmin');
const { loginLimiter } = require('../middleware/rateLimits');
const { query } = require('../config/database');

// ── POST /admin/login ──────────────────────────────────────────────────────────

router.post('/login', loginLimiter, [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        const user = await AdminUser.findByUsername(username);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await AdminUser.verifyPassword(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = AdminUser.generateToken(user);
        const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
        const expiresAt = new Date(Date.now() + parseExpiry(expiresIn)).toISOString();

        res.json({ token, expiresAt, username: user.username });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed', message: error.message });
    }
});

// ── POST /admin/logout ─────────────────────────────────────────────────────────

router.post('/logout', authAdmin, (req, res) => {
    // Bezstanowy JWT – klient po prostu usuwa token po swojej stronie
    res.json({ success: true, message: 'Logged out' });
});

// ── GET /admin/orders — lista zamówień z filtrami ──────────────────────────────

router.get('/orders', authAdmin, [
    qv('status').optional().isString(),
    qv('fulfillment_status').optional().isString(),
    qv('product_type').optional().isString(),
    qv('delivery_type').optional().isString(),
    qv('from').optional().isISO8601(),
    qv('to').optional().isISO8601(),
    qv('search').optional().isString(),
    qv('page').optional().isInt({ min: 1 }).toInt(),
    qv('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
], async (req, res) => {
    try {
        const {
            status,
            fulfillment_status,
            product_type,
            delivery_type,
            from,
            to,
            search,
            page  = 1,
            limit = 20,
        } = req.query;

        const offset = (page - 1) * limit;
        const conditions = ['1=1'];
        const vals = [];

        if (status) {
            conditions.push('o.status = ?');
            vals.push(status);
        }
        if (fulfillment_status) {
            conditions.push('o.fulfillment_status = ?');
            vals.push(fulfillment_status);
        }
        // interactive = tylko interactive (nie scratch, nie letter)
        if (product_type === 'interactive') {
            conditions.push(`(
              COALESCE(
                NULLIF(o.product_type, ''),
                IF(IFNULL(o.sku, '') LIKE 'scratch%', 'scratch',
                  IF(IFNULL(o.sku, '') LIKE 'santa%', 'letter', 'interactive'))
              ) = 'interactive'
            )`);
        } else if (product_type === 'scratch') {
            conditions.push(`(
              o.product_type = 'scratch'
              OR ((o.product_type IS NULL OR o.product_type = '') AND IFNULL(o.sku, '') LIKE 'scratch%')
            )`);
        } else if (product_type === 'letter') {
            conditions.push(`(
              o.product_type = 'letter'
              OR ((o.product_type IS NULL OR o.product_type = '') AND IFNULL(o.sku, '') LIKE 'santa%')
              OR o.id IN (SELECT order_id FROM order_items WHERE product_type = 'letter' OR sku = 'santa-letter')
            )`);
        } else if (product_type) {
            conditions.push('o.product_type = ?');
            vals.push(product_type);
        }
        if (delivery_type) {
            conditions.push('o.delivery_type = ?');
            vals.push(delivery_type);
        }
        if (from) {
            conditions.push('o.created_at >= ?');
            vals.push(from);
        }
        if (to) {
            conditions.push('o.created_at <= ?');
            vals.push(to);
        }
        if (search) {
            conditions.push('(o.customer_email LIKE ? OR o.customer_name LIKE ? OR o.id LIKE ?)');
            const like = `%${search}%`;
            vals.push(like, like, like);
        }

        const where = conditions.join(' AND ');

        // Count
        const [countRows] = await query(
            `SELECT COUNT(*) AS total FROM orders o WHERE ${where}`,
            vals
        );
        const total = countRows[0].total;

        // Data
        const [rows] = await query(
            `SELECT
               o.id, o.created_at, o.status, o.fulfillment_status,
               o.product_type, o.sku, o.amount, o.shipping_amount, o.currency,
               o.customer_email, o.customer_name,
               o.delivery_type, o.shipping_city,
               o.parcel_locker_id, o.parcel_locker_name,
               o.tracking_number, o.calendar_id,
               (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
               (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS items_quantity
             FROM orders o
             WHERE ${where}
             ORDER BY o.created_at DESC
             LIMIT ? OFFSET ?`,
            [...vals, parseInt(limit, 10), parseInt(offset, 10)]
        );

        res.json({ orders: rows, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
    } catch (error) {
        console.error('Admin orders list error:', error);
        res.status(500).json({ error: 'Failed to fetch orders', message: error.message });
    }
});

// ── GET /admin/orders/:id — szczegóły zamówienia ───────────────────────────────

router.get('/orders/:id', authAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await query(
            `SELECT o.*, c.title, c.author, c.tasks, c.design_url, c.format,
                    c.access_code, c.is_free, c.created_at AS calendar_created_at
             FROM orders o
             LEFT JOIN calendars c ON c.id = o.calendar_id
             WHERE o.id = ?`,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const row = rows[0];
        let items = [];
        try {
            const [itemRows] = await query(
                'SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC',
                [id]
            );
            items = itemRows.map((ir) => ({
                id: ir.id,
                sku: ir.sku,
                productType: ir.product_type,
                quantity: ir.quantity,
                unitPrice: parseFloat(ir.unit_price),
                calendarId: ir.calendar_id,
            }));
        } catch {
            items = [];
        }

        const order = {
            id:                        row.id,
            calendarId:                row.calendar_id,
            stripePaymentIntentId:     row.stripe_payment_intent_id,
            amount:                    parseFloat(row.amount),
            shippingAmount:            row.shipping_amount != null ? parseFloat(row.shipping_amount) : 0,
            currency:                  row.currency,
            status:                    row.status,
            fulfillmentStatus:         row.fulfillment_status,
            fulfillmentNotes:          row.fulfillment_notes,
            trackingNumber:            row.tracking_number,
            customerEmail:             row.customer_email,
            customerName:              row.customer_name,
            customerPhone:             row.customer_phone,
            productType:               row.product_type,
            sku:                       row.sku,
            deliveryType:              row.delivery_type,
            items,
            shipping: {
                street:     row.shipping_street,
                city:       row.shipping_city,
                postalCode: row.shipping_postal_code,
            },
            parcelLocker: row.parcel_locker_id ? {
                id:      row.parcel_locker_id,
                name:    row.parcel_locker_name,
                address: row.parcel_locker_address,
            } : null,
            termsAcceptedAt:          row.terms_accepted_at,
            privacyPolicyAcceptedAt:  row.privacy_policy_accepted_at,
            clientIP:                 row.client_ip,
            rabatCode:                row.rabat_code,
            metadata:                 typeof row.metadata === 'string'
                                        ? JSON.parse(row.metadata)
                                        : (row.metadata || {}),
            createdAt:                row.created_at,
            updatedAt:                row.updated_at,
            calendar: row.calendar_id ? {
                title:      row.title,
                author:     row.author,
                format:     row.format,
                designUrl:  row.design_url,
                accessCode: row.access_code,
                isFree:     !!row.is_free,
                tasks:      typeof row.tasks === 'string' ? JSON.parse(row.tasks) : (row.tasks || []),
                createdAt:  row.calendar_created_at,
            } : null,
        };

        res.json({ order });
    } catch (error) {
        console.error('Admin order detail error:', error);
        res.status(500).json({ error: 'Failed to fetch order', message: error.message });
    }
});

// ── PATCH /admin/orders/:id — edytuj zamówienie ────────────────────────────────

router.patch('/orders/:id', authAdmin, [
    body('fulfillment_status').optional().isString(),
    body('fulfillment_notes').optional().isString(),
    body('tracking_number').optional().isString(),
    body('status').optional().isIn(['pending', 'succeeded', 'failed']),
    body('delivery_type').optional().isIn(['none', 'poczta_polska', 'courier_inpost', 'parcel_inpost']),
    body('parcel_locker_id').optional().isString(),
    body('parcel_locker_name').optional().isString(),
    body('parcel_locker_address').optional().isString(),
    body('customer_name').optional().isString(),
    body('customer_phone').optional().isString(),
    body('shipping_street').optional().isString(),
    body('shipping_city').optional().isString(),
    body('shipping_postal_code').optional().isString(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;

        const EDITABLE = [
            'fulfillment_status', 'fulfillment_notes', 'tracking_number', 'status',
            'delivery_type', 'parcel_locker_id', 'parcel_locker_name', 'parcel_locker_address',
            'customer_name', 'customer_phone',
            'shipping_street', 'shipping_city', 'shipping_postal_code',
        ];

        const sets   = [];
        const values = [];

        for (const field of EDITABLE) {
            if (req.body[field] !== undefined) {
                sets.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }

        if (sets.length === 0) {
            return res.status(400).json({ error: 'No editable fields provided' });
        }

        values.push(id);
        const [result] = await query(
            `UPDATE orders SET ${sets.join(', ')} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Jeśli aktualizujemy fulfillment_status, zaktualizuj też kalendarz
        if (req.body.fulfillment_status) {
            const [orderRows] = await query('SELECT calendar_id FROM orders WHERE id = ?', [id]);
            if (orderRows.length) {
                await query(
                    'UPDATE calendars SET fulfillment_status = ? WHERE id = ?',
                    [req.body.fulfillment_status, orderRows[0].calendar_id]
                );
            }
        }

        const [updated] = await query('SELECT * FROM orders WHERE id = ?', [id]);
        res.json({ success: true, order: updated[0] });
    } catch (error) {
        console.error('Admin order patch error:', error);
        res.status(500).json({ error: 'Failed to update order', message: error.message });
    }
});

// ── GET /admin/calendars/:id — podgląd kalendarza ─────────────────────────────

router.get('/calendars/:id', authAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await query('SELECT * FROM calendars WHERE id = ?', [id]);

        if (!rows.length) {
            return res.status(404).json({ error: 'Calendar not found' });
        }

        const row = rows[0];
        res.json({
            calendar: {
                id:               row.id,
                title:            row.title,
                author:           row.author,
                email:            row.email,
                productType:      row.product_type,
                sku:              row.sku,
                format:           row.format,
                designUrl:        row.design_url,
                tasks:            typeof row.tasks === 'string' ? JSON.parse(row.tasks) : (row.tasks || []),
                status:           row.status,
                accessCode:       row.access_code,
                isFree:           !!row.is_free,
                fulfillmentStatus: row.fulfillment_status,
                fulfillmentNotes:  row.fulfillment_notes,
                createdAt:        row.created_at,
                updatedAt:        row.updated_at,
            },
        });
    } catch (error) {
        console.error('Admin calendar detail error:', error);
        res.status(500).json({ error: 'Failed to fetch calendar', message: error.message });
    }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseExpiry(str) {
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return 8 * 3600 * 1000;
    const n = parseInt(match[1], 10);
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return n * (units[match[2]] || 3600000);
}

// ── PATCH /admin/calendars/:id — edycja kalendarza (taski, tytuł, autor) ───────

router.patch('/calendars/:id', authAdmin, [
    body('tasks').optional().isArray(),
    body('title').optional().isString(),
    body('author').optional().isString(),
    body('email').optional().isString(),
    body('fulfillment_notes').optional().isString(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const [rows] = await query('SELECT * FROM calendars WHERE id = ?', [id]);
        if (!rows.length) {
            return res.status(404).json({ error: 'Calendar not found' });
        }

        const existing = rows[0];
        const sets = [];
        const values = [];

        if (req.body.title !== undefined) {
            sets.push('title = ?');
            values.push(req.body.title);
        }
        if (req.body.author !== undefined) {
            sets.push('author = ?');
            values.push(req.body.author);
        }
        if (req.body.email !== undefined) {
            sets.push('email = ?');
            values.push(req.body.email);
        }
        if (req.body.fulfillment_notes !== undefined) {
            sets.push('fulfillment_notes = ?');
            values.push(req.body.fulfillment_notes);
        }
        if (req.body.tasks !== undefined) {
            if (!Array.isArray(req.body.tasks)) {
                return res.status(400).json({ error: 'tasks must be an array' });
            }
            // Normalizuj taski: day + task (tekst) + opcjonalne pola
            const normalized = req.body.tasks.map((t, index) => {
                const day = Number(t.day) || index + 1;
                const text = String(t.task ?? t.title ?? t.content ?? '').trim();
                const out = { day, task: text };
                if (t.status) out.status = t.status;
                if (t.duration != null) out.duration = t.duration;
                if (t.latestDay != null) out.latestDay = t.latestDay;
                if (t.lockedDay != null) out.lockedDay = t.lockedDay;
                return out;
            });
            sets.push('tasks = ?');
            values.push(JSON.stringify(normalized));
        }

        if (sets.length === 0) {
            return res.status(400).json({ error: 'No editable fields provided' });
        }

        values.push(id);
        await query(`UPDATE calendars SET ${sets.join(', ')} WHERE id = ?`, values);

        const [updated] = await query('SELECT * FROM calendars WHERE id = ?', [id]);
        const row = updated[0];
        res.json({
            success: true,
            calendar: {
                id:                row.id,
                title:             row.title,
                author:            row.author,
                email:             row.email,
                productType:       row.product_type,
                sku:               row.sku,
                format:            row.format,
                designUrl:         row.design_url,
                tasks:             typeof row.tasks === 'string' ? JSON.parse(row.tasks) : (row.tasks || []),
                status:            row.status,
                accessCode:        row.access_code,
                isFree:            !!row.is_free,
                fulfillmentStatus: row.fulfillment_status,
                fulfillmentNotes:  row.fulfillment_notes,
                createdAt:         row.created_at,
                updatedAt:         row.updated_at,
            },
        });
    } catch (error) {
        console.error('Admin calendar patch error:', error);
        res.status(500).json({ error: 'Failed to update calendar', message: error.message });
    }
});

module.exports = router;

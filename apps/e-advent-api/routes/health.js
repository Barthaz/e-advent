const express = require('express');
const router = express.Router();
const { getPool, getMysqlConfig } = require('../config/database');
const { testingMode, getStripeConfig } = require('../config/app');
const stripe = require('../config/stripe');

// Health check endpoint
router.get('/', async (req, res) => {
    const mysqlCfg = getMysqlConfig();
    const stripeCfg = getStripeConfig();

    const healthCheck = {
        status: 'ok',
        version: '1.1',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mode: testingMode ? 'test' : 'prod',
        services: {
            database: {
                status: 'unknown',
                message: '',
                database: mysqlCfg.database,
            },
            stripe: {
                status: 'unknown',
                message: '',
                mode: stripeCfg.mode,
            },
        },
    };

    let allServicesHealthy = true;

    // Check MySQL connection
    try {
        const pool = getPool();
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        healthCheck.services.database = {
            status: 'healthy',
            message: 'MySQL connection successful',
            database: mysqlCfg.database,
        };
    } catch (error) {
        allServicesHealthy = false;
        healthCheck.services.database = {
            status: 'unhealthy',
            message: error.message || 'MySQL connection failed',
            database: mysqlCfg.database,
        };
    }

    // Check Stripe API connection
    try {
        if (!stripeCfg.secretKey) {
            healthCheck.services.stripe = {
                status: 'unhealthy',
                message: 'Stripe secret key is not configured for current mode',
                mode: stripeCfg.mode,
            };
            allServicesHealthy = false;
        } else {
            await stripe.customers.list({ limit: 1 });
            healthCheck.services.stripe = {
                status: 'healthy',
                message: 'Stripe API connection successful',
                mode: stripeCfg.mode,
            };
        }
    } catch (error) {
        allServicesHealthy = false;
        healthCheck.services.stripe = {
            status: 'unhealthy',
            message: error.message || 'Stripe API connection failed',
            mode: stripeCfg.mode,
        };
    }

    healthCheck.status = allServicesHealthy ? 'ok' : 'degraded';
    const statusCode = allServicesHealthy ? 200 : 503;

    res.status(statusCode).json(healthCheck);
});

module.exports = router;

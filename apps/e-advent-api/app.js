const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { connectDB } = require('./config/database');
const { testingMode, corsAllowlist } = require('./config/app');
const stripeRoutes = require('./routes/stripe');
const emailRoutes = require('./routes/email');
const calendarRoutes = require('./routes/calendars');
const healthRoutes = require('./routes/health');
const promocodeRoutes = require('./routes/promocodes');
const uploadRoutes = require('./routes/uploads');
const adminRoutes = require('./routes/admin');
const collaborationRoutes = require('./routes/collaboration');
const sharedTasksRoutes = require('./routes/sharedTasks');
const giftIdeasRoutes = require('./routes/giftIdeas');
const socketHandler = require('./socket/socketHandler');
const path = require('path');

const app = express();
const server = http.createServer(app);

const corsAllowedHeaders = [
  'Content-Type',
  'Authorization',
  'X-Calendar-Edit-Token',
  'X-Access-Code',
  'X-Access-Email',
];

// Konfiguracja CORS dla Socket.IO
const socketCorsConfig = testingMode ? {
  origin: true,
  methods: ['GET', 'POST'],
  credentials: true,
} : {
  origin: corsAllowlist,
  methods: ['GET', 'POST'],
  credentials: true,
};

const io = socketIo(server, {
  cors: socketCorsConfig,
});

if (testingMode) {
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: corsAllowedHeaders,
  }));
  console.log('⚠️ CORS w trybie testowym - zezwalanie na wszystkie originy (TESTING_MODE=true)');
} else {
  app.use(cors({
    origin: (origin, callback) => {
      // Allow non-browser / same-origin requests without Origin header
      if (!origin || corsAllowlist.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: corsAllowedHeaders,
  }));
  console.log('🔒 CORS allowlist:', corsAllowlist.join(', '));
}

// WAŻNE: Webhook Stripe wymaga surowego body (raw), nie sparsowanego JSON
// Wykluczamy webhook z parsowania JSON - musi być surowe body (Buffer)
app.use((req, res, next) => {
    // Jeśli to webhook Stripe, pomiń parsowanie JSON
    if (req.path === '/api/stripe/webhook' || req.path === '/api/v1/stripe/webhook') {
        return next();
    }
    // Dla wszystkich innych endpointów parsuj JSON
    bodyParser.json()(req, res, next);
});

app.use((req, res, next) => {
    // Jeśli to webhook Stripe, pomiń parsowanie URL encoded
    if (req.path === '/api/stripe/webhook' || req.path === '/api/v1/stripe/webhook') {
        return next();
    }
    // Dla wszystkich innych endpointów parsuj URL encoded
    bodyParser.urlencoded({ extended: true })(req, res, next);
});

// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const timestamp = new Date().toISOString();

    // Log request
    console.log(`\n[${timestamp}] ${req.method} ${req.originalUrl || req.url}`);
    console.log(`  📍 IP: ${clientIP}`);

    if (req.body && Object.keys(req.body).length > 0) {
        // Ukryj wrażliwe dane w logach
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.password) sanitizedBody.password = '***';
        if (sanitizedBody.EMAIL_PASS) sanitizedBody.EMAIL_PASS = '***';
        if (sanitizedBody.token) sanitizedBody.token = '***';
        if (sanitizedBody.clientSecret) sanitizedBody.clientSecret = '***';
        const bodyStr = JSON.stringify(sanitizedBody);
        console.log(`  📦 Body: ${bodyStr.length > 200 ? bodyStr.substring(0, 200) + '...' : bodyStr}`);
    }

    if (Object.keys(req.query).length > 0) {
        console.log(`  🔍 Query: ${JSON.stringify(req.query)}`);
    }

    // Log response
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const statusEmoji = statusCode >= 200 && statusCode < 300 ? '✅' : statusCode >= 400 ? '❌' : '⚠️';

        console.log(`  ${statusEmoji} ${statusCode} - ${duration}ms`);
        if (data && typeof data === 'string' && data.length < 500) {
            const responsePreview = data.length > 150 ? data.substring(0, 150) + '...' : data;
            console.log(`  📤 Response: ${responsePreview}`);
        }
        console.log(`─────────────────────────────────────────`);

        return originalSend.call(this, data);
    };

    next();
});

// Inicjalizuj pulę połączeń MySQL (lokalnie i na Vercel)
connectDB().catch(err => {
    console.error('Failed to connect to MySQL:', err);
    if (process.env.VERCEL !== '1') process.exit(1);
});

// API Version
const API_VERSION = '1.1';
const MIN_ANDROID_VERSION = '1.0.2';

// Middleware do dodawania wersji do odpowiedzi
app.use((req, res, next) => {
    res.setHeader('X-API-Version', API_VERSION);
    next();
});

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'e-Advent API is running!',
        apiVersion: API_VERSION,
        minAndroidVersion: MIN_ANDROID_VERSION,
        endpoints: {
            v1: '/api/v1'
        }
    });
});

// API v1 routes
app.use('/api/v1/stripe', stripeRoutes);
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/calendars', calendarRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/promocodes', promocodeRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/collaboration', collaborationRoutes);
app.use('/api/v1/shared-tasks', sharedTasksRoutes);
app.use('/api/v1/gift-ideas', giftIdeasRoutes);

// Android minimum version endpoint
app.get('/api/v1/android/min-version', (req, res) => {
    res.json({
        minVersion: MIN_ANDROID_VERSION,
        apiVersion: API_VERSION
    });
});

// Backward compatibility - przekierowanie ze starych endpointów do v1
app.use('/api/stripe', stripeRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/send-email', emailRoutes); // Alternatywna ścieżka dla /api/send-email
app.use('/api/send-mail', emailRoutes); // Alternatywna ścieżka dla /api/send-mail (testowy endpoint)
app.use('/api/calendars', calendarRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/promocodes', promocodeRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/shared-tasks', sharedTasksRoutes);
app.use('/api/gift-ideas', giftIdeasRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/health', healthRoutes); // Alternatywna ścieżka dla healthcheck

// Backward compatibility - Android min version endpoint
app.get('/api/android/min-version', (req, res) => {
    res.json({
        minVersion: MIN_ANDROID_VERSION,
        apiVersion: API_VERSION
    });
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    socketHandler(io, socket);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;

// Uruchom serwer tylko jeśli nie jesteśmy na Vercel ani w testach Jest
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Mode: ${testingMode ? 'TEST (test DB + Stripe test)' : 'PROD (prod DB + Stripe live)'}`);
    });
}

// Eksportuj app dla Vercel (serverless function)
module.exports = app;


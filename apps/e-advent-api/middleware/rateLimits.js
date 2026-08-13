const rateLimit = require('express-rate-limit');

const isTestEnv = process.env.NODE_ENV === 'test';

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max: isTestEnv ? 10000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests', message },
    // In tests we still want A-05 to detect rate limiting when forced;
    // use a dedicated strict limiter for login below when NODE_ENV=test and FORCE_RATE_LIMIT=true
  });
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.FORCE_RATE_LIMIT === 'true' ? 5 : (isTestEnv ? 10000 : 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Zbyt wiele prób logowania. Spróbuj ponownie później.' },
});

const createFreeLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Zbyt wiele prób aktywacji darmowego kalendarza.',
});

const promocodeLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Zbyt wiele prób sprawdzania kodów promocyjnych.',
});

const uploadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: 'Zbyt wiele uploadów. Spróbuj ponownie później.',
});

module.exports = {
  loginLimiter,
  createFreeLimiter,
  promocodeLimiter,
  uploadLimiter,
};

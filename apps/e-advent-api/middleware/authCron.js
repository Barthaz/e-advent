const crypto = require('crypto');

function timingSafeEqualString(a, b) {
  const bufA = Buffer.from(String(a || ''));
  const bufB = Buffer.from(String(b || ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function authCron(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'Cron is not configured' });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const queryToken = typeof req.query.secret === 'string' ? req.query.secret : '';
  const provided = token || queryToken;

  if (!timingSafeEqualString(provided, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = authCron;

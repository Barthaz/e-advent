const { query } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const DEFAULT_INSECURE_SECRET = 'change-me-in-production';

const JWT_SECRET = () => {
  const secret = process.env.JWT_SECRET || DEFAULT_INSECURE_SECRET;
  if (
    process.env.NODE_ENV === 'production'
    && (!process.env.JWT_SECRET || secret === DEFAULT_INSECURE_SECRET)
  ) {
    throw new Error('JWT_SECRET must be set to a strong value in production');
  }
  return secret;
};

const JWT_EXPIRES_IN = () => process.env.JWT_EXPIRES_IN || '8h';

const findByUsername = async (username) => {
  const [rows] = await query('SELECT * FROM admin_users WHERE username = ?', [username]);
  return rows[0] || null;
};

const verifyPassword = async (plain, hash) => {
  return bcrypt.compare(plain, hash);
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET(),
    { expiresIn: JWT_EXPIRES_IN() }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET());
};

module.exports = { findByUsername, verifyPassword, generateToken, verifyToken, JWT_SECRET };

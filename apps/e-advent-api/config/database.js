const mysql = require('mysql2/promise');
const { testingMode, getMysqlConfig } = require('./app');

const { AsyncLocalStorage } = require('node:async_hooks');
const transactionContext = new AsyncLocalStorage();
const connectionContext = new AsyncLocalStorage();
let pool = null;

const createPool = () => {
  if (pool) return pool;

  const cfg = getMysqlConfig();

  pool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: '+00:00',
  });
  if (typeof pool.on === 'function') {
    pool.on('connection', (connection) => {
      connection.query("SET time_zone = '+00:00'");
    });
  }

  console.log(
    `MySQL pool created [${testingMode ? 'TEST' : 'PROD'}] → ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`
  );
  return pool;
};

const getPool = () => {
  if (!pool) createPool();
  return pool;
};

// Pojedyncze zapytanie - zwraca [rows, fields]
const query = async (sql, params = []) => {
  const transaction = transactionContext.getStore() || connectionContext.getStore();
  if (transaction) return transaction.execute(sql, params);
  const p = getPool();
  try {
    return await p.execute(sql, params);
  } catch (err) {
    const retryable = ['ECONNRESET', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR'];
    if (retryable.includes(err.code)) {
      return p.execute(sql, params);
    }
    throw err;
  }
};

// Transakcja pomocnicza
const withTransaction = async (fn) => {
  const active = transactionContext.getStore();
  if (active) return fn(active);
  const shared = connectionContext.getStore();
  const conn = shared || await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await transactionContext.run(conn, () => fn(conn));
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    if (!shared) conn.release();
  }
};

// MySQL locks coordinate API instances as well as concurrent requests. All work
// uses this connection so waiting requests cannot exhaust a second pool slot.
const withNamedLocks = async (keys, fn) => {
  const { createHash } = require('node:crypto');
  const names = [...new Set(keys)].sort().map(key => createHash('sha256').update(key).digest('hex'));
  const conn = await getPool().getConnection();
  const acquired = [];
  let reusable = true;
  try {
    for (const name of names) {
      const [rows] = await conn.execute('SELECT GET_LOCK(?, 10) AS acquired', [name]);
      if (Number(rows[0]?.acquired) !== 1) throw Object.assign(new Error('Checkout is busy. Please retry.'), { status: 409 });
      acquired.push(name);
    }
    return await connectionContext.run(conn, () => fn(conn));
  } finally {
    for (const name of acquired.reverse()) {
      try { await conn.execute('SELECT RELEASE_LOCK(?)', [name]); }
      catch { reusable = false; }
    }
    if (reusable) conn.release();
    else conn.destroy(); // Never return a connection holding an advisory lock.
  }
};

async function ensureCalendarOriginSchema(conn) {
  const { database } = getMysqlConfig();
  const [cols] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'calendars' AND COLUMN_NAME = 'origin'`,
    [database],
  );
  if (!Number(cols[0]?.cnt)) {
    try {
      await conn.execute(
        `ALTER TABLE calendars
         ADD COLUMN origin VARCHAR(20) NOT NULL DEFAULT 'store'
           COMMENT 'store = checkout / shop; generator = admin panel'
           AFTER daily_content_email`,
      );
      console.log('Added calendars.origin');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) throw err;
    }
  }

  const [indexes] = await conn.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'calendars' AND INDEX_NAME = 'idx_cal_origin'`,
    [database],
  );
  if (!Number(indexes[0]?.cnt)) {
    try {
      await conn.execute('CREATE INDEX idx_cal_origin ON calendars (origin)');
      console.log('Added calendars.idx_cal_origin');
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME' && err.errno !== 1061) throw err;
    }
  }
}

const connectDB = async () => {
  const p = createPool();
  const conn = await p.getConnection();
  try {
    await conn.ping();
    await ensureCalendarOriginSchema(conn);
  } finally {
    conn.release();
  }
  console.log('MySQL connected successfully');
};

const closeConnection = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('MySQL connection pool closed');
  }
};

process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

module.exports = {
  connectDB,
  getPool,
  query,
  withTransaction,
  withNamedLocks,
  closeConnection,
  getMysqlConfig,
};

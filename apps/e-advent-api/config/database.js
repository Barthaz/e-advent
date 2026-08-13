const mysql = require('mysql2/promise');
const { testingMode, getMysqlConfig } = require('./app');

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
  const p = getPool();
  return p.execute(sql, params);
};

// Transakcja pomocnicza
const withTransaction = async (fn) => {
  const conn = await getPool().getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const connectDB = async () => {
  const p = createPool();
  // Testuj połączenie
  const conn = await p.getConnection();
  await conn.ping();
  conn.release();
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
  closeConnection,
  getMysqlConfig,
};

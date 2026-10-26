jest.mock('mysql2/promise', () => ({ createPool: jest.fn() }));
jest.mock('../../config/app', () => ({ testingMode: true, getMysqlConfig: () => ({ host: 'mock', user: 'test', database: 'test' }) }));
const mysql = require('mysql2/promise');
const { withTransaction, withNamedLocks, query, closeConnection } = require('../../config/database');
let conn, pool;
beforeEach(() => {
  conn = { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(), execute: jest.fn().mockResolvedValue([[]]) };
  pool = { getConnection: jest.fn().mockResolvedValue(conn), execute: jest.fn(), end: jest.fn(), on: jest.fn() };
  mysql.createPool.mockReturnValue(pool);
});
afterEach(async () => { await closeConnection(); });
test('model queries inside a transaction use the same connection', async () => {
  await withTransaction(async () => { await query('INSERT order'); await query('INSERT items'); });
  expect(conn.execute.mock.calls).toEqual([['INSERT order', []], ['INSERT items', []]]);
  expect(pool.execute).not.toHaveBeenCalled();
  expect(conn.commit).toHaveBeenCalledTimes(1);
  expect(conn.release).toHaveBeenCalledTimes(1);
});
test('failed write rolls back and is not retried on another connection', async () => {
  conn.execute.mockRejectedValue(Object.assign(new Error('connection lost'), { code: 'ECONNRESET' }));
  await expect(withTransaction(() => query('INSERT items'))).rejects.toThrow('connection lost');
  expect(conn.execute).toHaveBeenCalledTimes(1);
  expect(conn.rollback).toHaveBeenCalledTimes(1);
  expect(conn.commit).not.toHaveBeenCalled();
  expect(conn.release).toHaveBeenCalledTimes(1);
  expect(pool.execute).not.toHaveBeenCalled();
});
test('checkout locks, nested model transactions and queries share one pool connection', async () => {
  conn.execute.mockResolvedValue([[{ acquired: 1 }]]);
  await withNamedLocks(['checkout:a', 'calendar:b'], () => withTransaction(() => withTransaction(() => query('INSERT order'))));
  expect(pool.getConnection).toHaveBeenCalledTimes(1);
  expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
  expect(conn.commit).toHaveBeenCalledTimes(1);
  expect(conn.release).toHaveBeenCalledTimes(1);
  expect(conn.execute.mock.calls.filter(([sql]) => sql.startsWith('SELECT RELEASE_LOCK'))).toHaveLength(2);
});
test('a lock timeout releases acquired locks and prevents checkout work', async () => {
  conn.execute.mockResolvedValueOnce([[{ acquired: 1 }]]).mockResolvedValueOnce([[{ acquired: 0 }]]);
  const work = jest.fn();
  await expect(withNamedLocks(['a', 'b'], work)).rejects.toMatchObject({ status: 409 });
  expect(work).not.toHaveBeenCalled();
  expect(conn.execute.mock.calls.filter(([sql]) => sql.startsWith('SELECT RELEASE_LOCK'))).toHaveLength(1);
  expect(conn.release).toHaveBeenCalledTimes(1);
});

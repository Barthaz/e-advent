jest.mock('../../config/database', () => ({
  query: jest.fn(),
  withNamedLocks: jest.fn((keys, fn) => fn()),
}));

const db = require('../../config/database');
const { removeCertificate, removeOneLetter } = require('../../services/orderLetterPack');

const ORDER_ID = '22222222-2222-4222-8222-222222222222';
const LETTER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CERT_A = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CERT_B = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function letterRow(overrides = {}) {
  return {
    id: LETTER_ID,
    order_id: ORDER_ID,
    sku: 'santa-letter',
    quantity: 3,
    unit_price: 29,
    vat_rate: 23,
    line_brutto: 87,
    line_netto: 70.73,
    line_vat: 16.27,
    created_at: '2026-10-01 10:00:00',
    ...overrides,
  };
}

function certRow(id, createdAt) {
  return {
    id,
    order_id: ORDER_ID,
    sku: 'santa-certificate',
    quantity: 1,
    unit_price: 9,
    vat_rate: 23,
    metadata: { childName: id === CERT_A ? 'Kasia' : 'Jan' },
    created_at: createdAt,
  };
}

describe('orderLetterPack', () => {
  let items;

  beforeEach(() => {
    items = [
      letterRow(),
      certRow(CERT_A, '2026-10-01 10:00:01'),
      certRow(CERT_B, '2026-10-01 10:00:02'),
    ];
    db.query.mockImplementation(async (sql, params = []) => {
      if (String(sql).includes('FROM orders')) return [[{ id: ORDER_ID, fulfillment_status: 'processing' }]];
      if (String(sql).includes('SELECT * FROM order_items')) return [items];
      if (String(sql).startsWith('UPDATE order_items')) {
        const [quantity, , , , id] = params;
        items = items.map((row) => (row.id === id ? { ...row, quantity } : row));
        return [{ affectedRows: 1 }];
      }
      if (String(sql).startsWith('DELETE')) {
        items = items.filter((row) => row.id !== params[0]);
        return [{ affectedRows: 1 }];
      }
      return [[]];
    });
  });

  test('removeCertificate deletes only that certificate', async () => {
    await expect(removeCertificate(ORDER_ID, CERT_A)).resolves.toMatchObject({
      removed: 'certificate',
      itemId: CERT_A,
    });
    expect(items.some((row) => row.id === CERT_A)).toBe(false);
    expect(items.some((row) => row.id === CERT_B)).toBe(true);
    expect(items.some((row) => row.sku === 'santa-letter')).toBe(true);
  });

  test('removeOneLetter decreases letter quantity and drops the last certificate', async () => {
    const result = await removeOneLetter(ORDER_ID);
    expect(result).toMatchObject({
      removed: 'letter',
      certificateId: CERT_B,
      removedCertificate: true,
    });
    expect(db.query.mock.calls.some(([sql, params]) => (
      String(sql).startsWith('UPDATE order_items') && params[0] === 2
    ))).toBe(true);
    expect(db.query.mock.calls.some(([sql, params]) => (
      String(sql).startsWith('DELETE') && params[0] === CERT_B
    ))).toBe(true);
  });

  test('cancelled orders cannot be edited', async () => {
    db.query.mockImplementation(async (sql) => {
      if (sql.includes('FROM orders')) return [[{ id: ORDER_ID, fulfillment_status: 'cancelled' }]];
      return [[]];
    });
    await expect(removeOneLetter(ORDER_ID)).rejects.toMatchObject({ status: 409 });
  });
});

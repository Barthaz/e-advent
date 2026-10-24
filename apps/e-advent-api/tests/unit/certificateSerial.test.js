jest.mock('../../config/database', () => ({
  query: jest.fn(),
  withNamedLocks: jest.fn((keys, fn) => fn()),
}));

const db = require('../../config/database');
const { allocateCertificateNumber, readExistingNumber } = require('../../services/certificate/certificateSerial');

describe('certificate serial', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.withNamedLocks.mockImplementation((keys, fn) => fn());
  });

  test('reuses a number already stored on the item', async () => {
    await expect(allocateCertificateNumber({
      id: 'item-1',
      metadata: { childName: 'Kasia', certificateNumber: 9 },
    })).resolves.toBe(9);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('assigns the next number and persists it', async () => {
    db.query
      .mockResolvedValueOnce([[{ id: 'item-1', metadata: { childName: 'Kasia' } }]])
      .mockResolvedValueOnce([[{ max_n: 4 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    await expect(allocateCertificateNumber({ id: 'item-1', metadata: {} })).resolves.toBe(5);
    expect(db.query.mock.calls[2][0]).toMatch(/UPDATE order_items SET metadata/);
    expect(JSON.parse(db.query.mock.calls[2][1][0])).toMatchObject({
      childName: 'Kasia',
      certificateNumber: 5,
    });
  });

  test('readExistingNumber ignores junk', () => {
    expect(readExistingNumber({ certificateNumber: 'nope' })).toBeNull();
    expect(readExistingNumber({ certificateNumber: 3 })).toBe(3);
  });
});

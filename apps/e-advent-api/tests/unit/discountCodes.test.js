jest.mock('../../config/database', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(fn => fn()),
}));

const db = require('../../config/database');
const { validatePromoCode, redeem, createCodes, ensureNamedCode, isAvailable } = require('../../services/discountCodes');
const { discountRow, installDiscountStore } = require('../helpers/discountFixture');

describe('discount codes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue([[], []]);
  });

  test('validates reusable 10%, 20% and 100% codes', async () => {
    installDiscountStore(db.query, [
      discountRow({ code: 'SAVE10', percent: 10 }),
      discountRow({ id: 'disc-20', code: 'MIKOLAJ20', percent: 20 }),
      discountRow({ id: 'disc-100', code: 'FREE100', percent: 100 }),
    ]);
    await expect(validatePromoCode('save10')).resolves.toMatchObject({ valid: true, discount: 10 });
    await expect(validatePromoCode('mikolaj20')).resolves.toMatchObject({ valid: true, discount: 20 });
    await expect(validatePromoCode('free100')).resolves.toMatchObject({ valid: true, discount: 100 });
    await expect(validatePromoCode('nope12')).resolves.toMatchObject({ valid: false, discount: 0 });
  });

  test('one-time code can be redeemed only once', async () => {
    installDiscountStore(db.query, [discountRow({ code: 'ONCE10', percent: 10, reusable: 0 })]);
    await redeem('ONCE10', { orderId: 'order-1', email: 'a@example.com' });
    await expect(redeem('ONCE10', { orderId: 'order-2', email: 'b@example.com' })).rejects.toMatchObject({ status: 409 });
  });

  test('reusable code can be redeemed twice', async () => {
    installDiscountStore(db.query, [discountRow({ code: 'MANY10', percent: 10, reusable: 1 })]);
    await expect(redeem('MANY10', { orderId: 'order-1', email: 'a@example.com' })).resolves.toMatchObject({ code: 'MANY10' });
    await expect(redeem('MANY10', { orderId: 'order-2', email: 'b@example.com' })).resolves.toMatchObject({ code: 'MANY10' });
  });

  test('repeat redemption for the same order is skipped', async () => {
    installDiscountStore(db.query, [discountRow({ code: 'ONCE10', percent: 10, reusable: 0 })]);
    await redeem('ONCE10', { orderId: 'order-1', email: 'a@example.com' });
    await expect(redeem('ONCE10', { orderId: 'order-1', email: 'a@example.com' })).resolves.toMatchObject({ skipped: true });
  });

  test('used one-time code is no longer available', () => {
    expect(isAvailable(discountRow({ reusable: 0, uses_count: 1 }))).toBe(false);
    expect(isAvailable(discountRow({ reusable: 1, uses_count: 4 }))).toBe(true);
    expect(isAvailable(discountRow({ active: 0 }))).toBe(false);
  });

  test('createCodes inserts the requested percent and reuse flag', async () => {
    installDiscountStore(db.query, []);
    const created = await createCodes({ percent: 10, reusable: false, count: 2 });
    expect(created).toHaveLength(2);
    expect(created.every(code => code.percent === 10 && code.reusable === false && /^[A-Z2-9]{8}$/.test(code.code))).toBe(true);
  });

  test('ensureNamedCode upserts a reusable 20% code', async () => {
    installDiscountStore(db.query, []);
    const created = await ensureNamedCode({ code: 'MIKOLAJ20', percent: 20, reusable: true });
    expect(created).toMatchObject({ code: 'MIKOLAJ20', percent: 20, reusable: true, active: true });
    const updated = await ensureNamedCode({ code: 'mikolaj20', percent: 20, reusable: true });
    expect(updated.id).toBe(created.id);
    expect(updated.percent).toBe(20);
  });
});

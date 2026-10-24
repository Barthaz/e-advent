function discountRow(overrides = {}) {
  return {
    id: overrides.id || 'disc-rabat100',
    code: String(overrides.code || 'RABAT100').toUpperCase(),
    percent: overrides.percent ?? 100,
    reusable: overrides.reusable === 0 || overrides.reusable === false ? 0 : 1,
    active: overrides.active === 0 || overrides.active === false ? 0 : 1,
    uses_count: overrides.uses_count ?? 0,
    created_at: overrides.created_at || new Date('2026-01-01T00:00:00Z'),
  };
}

function installDiscountStore(query, seed = [discountRow()]) {
  const codes = new Map(seed.map(row => [row.code, { ...row }]));
  const redemptions = [];
  const previous = query.getMockImplementation() || (async () => [[], []]);
  query.mockImplementation(async (sql, args = []) => {
    const text = String(sql);
    if (text.includes('FROM discount_codes WHERE code')) {
      const row = codes.get(String(args[0] || '').toUpperCase());
      return [row ? [row] : []];
    }
    if (text.includes('FROM discount_redemptions WHERE order_id')) {
      return [redemptions.filter(row => row.order_id === args[0])];
    }
    if (text.startsWith('UPDATE discount_codes SET uses_count')) {
      const row = [...codes.values()].find(item => item.id === args[0]);
      if (row && Number(row.active) && (Number(row.reusable) || Number(row.uses_count) === 0)) {
        row.uses_count += 1;
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }
    if (text.startsWith('INSERT INTO discount_redemptions')) {
      redemptions.push({ id: args[0], code_id: args[1], order_id: args[2], customer_email: args[3] });
      return [{ affectedRows: 1 }];
    }
    if (text.startsWith('INSERT INTO discount_codes')) {
      const row = discountRow({
        id: args[0], code: args[1], percent: args[2], reusable: args[3], active: 1, uses_count: 0,
      });
      if (codes.has(row.code)) {
        throw Object.assign(new Error('Duplicate'), { code: 'ER_DUP_ENTRY' });
      }
      codes.set(row.code, row);
      return [{ affectedRows: 1 }];
    }
    if (text.includes('FROM discount_codes ORDER BY')) {
      return [[...codes.values()]];
    }
    if (text.startsWith('UPDATE discount_codes SET percent')) {
      const row = [...codes.values()].find(item => item.id === args[2]);
      if (row) {
        row.percent = args[0];
        row.reusable = args[1] ? 1 : 0;
        row.active = 1;
      }
      return [{ affectedRows: row ? 1 : 0 }];
    }
    if (text.startsWith('UPDATE discount_codes SET active')) {
      const row = [...codes.values()].find(item => item.id === args[1]);
      if (row) row.active = args[0] ? 1 : 0;
      return [{ affectedRows: row ? 1 : 0 }];
    }
    if (text.includes('FROM discount_codes WHERE id')) {
      const row = [...codes.values()].find(item => item.id === args[0]);
      return [row ? [row] : []];
    }
    return previous(sql, args);
  });
  return { codes, redemptions };
}

module.exports = { discountRow, installDiscountStore };

'use strict';

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(async (fn) => fn()),
}));
jest.mock('../../models/Calendar', () => ({
  findCalendarById: jest.fn(),
  verifyEditToken: jest.fn(() => true),
}));
jest.mock('../../services/inpost', () => ({
  resolveDelivery: jest.fn(async () => ({
    price: 13.99,
    receiver: {
      first_name: 'Anna', last_name: 'Nowak', phone: '500600700',
      address: { street: 'Kwiatowa', building_number: '1', city: 'Kraków', post_code: '30-001' },
    },
  })),
}));

const fs = require('node:fs');
const path = require('node:path');
const db = require('../../config/database');
const { validatePersonalization } = require('../../services/santaMessages/validation');
const { buildSantaScript } = require('../../services/santaMessages/script');
const crypto = require('../../services/santaMessages/crypto');
const { mp3Info } = require('../../services/santaMessages/mp3');
const { resolveCheckoutItems } = require('../../services/orderCheckout');
const { computeOrderTotals } = require('../../config/products');
const fulfillment = require('../../services/santaMessages/fulfillment');

const VALID = {
  childName: 'Zosia',
  childVocative: 'Zosiu',
  addressForm: 'female',
  ageBand: '4-6',
  achievement: 'Nauczyła się sama jeździć na rowerze',
  proudOf: 'Wspaniale opiekuje się młodszym bratem',
};

const SHIPPING = { firstName: 'Anna', lastName: 'Nowak', street: 'Kwiatowa 1', city: 'Kraków', postalCode: '30-001', phone: '500600700' };
const ENV_KEYS = ['SANTA_MESSAGES_ENABLED', 'SANTA_STANDALONE_ENABLED', 'SANTA_LETTER_ADDON_ENABLED'];

function enableSales(on = true) {
  for (const key of ENV_KEYS) process.env[key] = on ? 'true' : 'false';
}

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-santa-messages-0123456789';
});

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  db.query.mockReset();
});

describe('personalization validation', () => {
  test('accepts a complete form and normalizes whitespace', () => {
    const { value, errors } = validatePersonalization({ ...VALID, proudOf: '  Wspaniale   opiekuje się bratem ' });
    expect(errors).toEqual([]);
    expect(value.proudOf).toBe('Wspaniale opiekuje się bratem');
  });

  test('reports required fields, links and markup without truncating', () => {
    const { value, errors } = validatePersonalization({
      ...VALID,
      childVocative: '',
      achievement: 'Zobacz www.example.com',
      proudOf: '<b>tak</b> jest',
      wishes: 'x'.repeat(181),
    });
    expect(value).toBeNull();
    expect(errors).toEqual(expect.arrayContaining([
      { field: 'childVocative', code: 'REQUIRED' },
      { field: 'achievement', code: 'LINK_NOT_ALLOWED' },
      { field: 'proudOf', code: 'INVALID_CHARS' },
      { field: 'wishes', code: 'TOO_LONG', max: 180 },
    ]));
  });

  test('counts Unicode characters, not bytes', () => {
    const { errors } = validatePersonalization({ ...VALID, achievement: 'ż'.repeat(180) });
    expect(errors).toEqual([]);
  });

  test('rejects unknown address forms', () => {
    const { errors } = validatePersonalization({ ...VALID, addressForm: 'other' });
    expect(errors).toEqual([{ field: 'addressForm', code: 'INVALID_OPTION' }]);
  });
});

describe('script template', () => {
  test('quotes parent text, uses the vocative and the chosen grammatical form', () => {
    const { value } = validatePersonalization(VALID);
    const script = buildSantaScript(value);
    expect(script.spokenText).toContain('Witaj, Zosiu!');
    expect(script.spokenText).toContain('„Nauczyła się sama jeździć na rowerze”');
    expect(script.spokenText).toContain('jaka jesteś dzielna');
    expect(script.usedFields).not.toContain('workingOn');
    expect(script.spokenText).not.toMatch(/pracujesz/);
    expect(script.spokenText).not.toMatch(/dostaniesz|prezent dla Ciebie/);
  });

  test('switches to the compact variant when long answers would exceed the limit', () => {
    const long = 'Bardzo lubi pomagać innym dzieciom i zawsze dzieli się zabawkami z kolegami oraz koleżankami z grupy przedszkolnej, a także z rodzeństwem po obiedzie w domu';
    const script = buildSantaScript({
      ...VALID, achievement: long, proudOf: long, workingOn: long.slice(0, 150), wishes: long, siblingsNote: long.slice(0, 120),
    }, { maxSeconds: 120 });
    expect(script.version).toBe('template-1-compact');
    expect(script.estimatedSeconds).toBeLessThanOrEqual(120);
  });
});

describe('tokens and encryption', () => {
  test('derived tokens are stable per version and only their hash is comparable', () => {
    const a = crypto.deriveToken('play', 'id-1', 1);
    expect(crypto.deriveToken('play', 'id-1', 1)).toBe(a);
    expect(crypto.deriveToken('play', 'id-1', 2)).not.toBe(a);
    expect(crypto.deriveToken('activate', 'id-1', 1)).not.toBe(a);
    expect(crypto.isTokenShape(a)).toBe(true);
    expect(crypto.tokenHash(a)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('personal data round-trips through AES-GCM and is not stored in clear text', () => {
    const sealed = crypto.encryptJson(VALID);
    expect(sealed).not.toContain('Zosia');
    expect(crypto.decryptJson(sealed)).toEqual(VALID);
  });

  test('audio signatures bind message, expiry and download flag', () => {
    const sig = crypto.audioSignature('m1', 1000, false);
    expect(crypto.verifyAudioSignature('m1', 1000, false, sig)).toBe(true);
    expect(crypto.verifyAudioSignature('m1', 1000, true, sig)).toBe(false);
    expect(crypto.verifyAudioSignature('m2', 1000, false, sig)).toBe(false);
  });
});

describe('mp3 duration', () => {
  test('measures the bundled sample and rejects non-audio', () => {
    const sample = fs.readFileSync(path.join(__dirname, '../../../e-advent-frontend/public/assets/santa_sample.mp3'));
    const info = mp3Info(sample);
    expect(info.durationSeconds).toBeGreaterThan(20);
    expect(info.durationSeconds).toBeLessThan(30);
    expect(mp3Info(Buffer.alloc(4096, 7))).toBeNull();
  });
});

describe('order totals', () => {
  test('voice messages are digital: no shipping on their own and no free-shipping effect', () => {
    const voiceOnly = computeOrderTotals([{ sku: 'voice-message', quantity: 1 }]);
    expect(voiceOnly).toMatchObject({ subtotal: 19.9, shipping: 0, total: 19.9, hasPhysical: false });

    const letterOnly = computeOrderTotals([{ sku: 'santa-letter', quantity: 1 }]);
    const withAddon = computeOrderTotals([{ sku: 'santa-letter', quantity: 1 }, { sku: 'voice-message-addon', quantity: 1 }]);
    expect(withAddon.shipping).toBe(letterOnly.shipping);
    expect(withAddon.total).toBeCloseTo(letterOnly.total + 14.9, 2);
  });
});

describe('checkout validation', () => {
  test('rejects voice SKUs while the feature flags are off', async () => {
    const result = await resolveCheckoutItems({ items: [{ sku: 'voice-message', quantity: 1 }], customerEmail: 'a@b.pl' });
    expect(result.errors[0].msg).toMatch(/niedostępna/);
  });

  test('the add-on price requires a letter in the same order', async () => {
    enableSales();
    const result = await resolveCheckoutItems({ items: [{ sku: 'voice-message-addon', quantity: 1 }], customerEmail: 'a@b.pl' });
    expect(result.errors[0].msg).toMatch(/List/);
  });

  test('a letter with an add-on is priced on the server', async () => {
    enableSales();
    const result = await resolveCheckoutItems({
      items: [{ sku: 'santa-letter', quantity: 1 }, { sku: 'voice-message-addon', quantity: 1 }],
      customerEmail: 'a@b.pl',
      shippingAddress: SHIPPING,
    });
    expect(result.errors).toBeUndefined();
    expect(result.totals.lines.map((l) => l.unitPrice)).toEqual([29, 14.9]);
    expect(result.items[1].metadata).toEqual({ voiceMode: 'letter_addon' });
    expect(result.primarySku).toBe('santa-letter');
  });

  test('more add-ons than letters are rejected', async () => {
    enableSales();
    const result = await resolveCheckoutItems({
      items: [{ sku: 'santa-letter', quantity: 1 }, { sku: 'voice-message-addon', quantity: 2 }],
      customerEmail: 'a@b.pl',
      shippingAddress: SHIPPING,
    });
    expect(result.errors[0].msg).toMatch(/jedna na każdy list/);
  });

  test('a draft line needs a matching draft key and stores only the draft id', async () => {
    enableSales();
    const draftId = '8b7b1f7e-3a3f-4c55-9a71-1c2d3e4f5a6b';
    db.query.mockResolvedValueOnce([[]]);
    const missing = await resolveCheckoutItems({
      items: [{ sku: 'voice-message', quantity: 1, metadata: { voiceDraftId: draftId, voiceDraftKey: 'k'.repeat(43) } }],
      customerEmail: 'a@b.pl',
    });
    expect(missing.errors[0].msg).toMatch(/wygasła/);

    db.query.mockResolvedValueOnce([[{ id: draftId, status: 'draft' }]]);
    const ok = await resolveCheckoutItems({
      items: [{ sku: 'voice-message', quantity: 1, metadata: { voiceDraftId: draftId, voiceDraftKey: 'k'.repeat(43) } }],
      customerEmail: 'a@b.pl',
    });
    expect(ok.errors).toBeUndefined();
    expect(ok.items[0].metadata).toEqual({ voiceMode: 'standalone', voiceDraftId: draftId });
    expect(ok.totals.total).toBe(19.9);
    expect(ok.hasPhysical).toBe(false);
  });

  test('carts without voice items are untouched by the feature', async () => {
    const result = await resolveCheckoutItems({
      items: [{ sku: 'santa-letter', quantity: 2 }],
      customerEmail: 'a@b.pl',
      shippingAddress: SHIPPING,
    });
    expect(result.errors).toBeUndefined();
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('post-payment hook', () => {
  test('never throws into the payment pipeline', async () => {
    db.query.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(fulfillment.onOrderPaid('order-err-1')).resolves.toEqual({ error: true });
    console.error.mockRestore();
  });

  test('creates one instance per unit and queues the first e-mail only once', async () => {
    const inserted = new Set();
    const deliveries = [];
    db.query.mockImplementation(async (sql, params = []) => {
      if (sql.startsWith('SELECT id, status, customer_email')) return [[{ id: 'o1', status: 'succeeded', customer_email: 'a@b.pl', order_number: 7 }]];
      if (sql.startsWith('SELECT id, sku, quantity, metadata FROM order_items')) {
        return [[{ id: 'i1', sku: 'voice-message-addon', quantity: 2, metadata: { voiceMode: 'letter_addon' } }, { id: 'i0', sku: 'santa-letter', quantity: 2, metadata: {} }]];
      }
      if (sql.includes('INSERT IGNORE INTO santa_message_instances')) {
        const key = `${params[2]}:${params[3]}`;
        if (inserted.has(key)) return [{ affectedRows: 0 }];
        inserted.add(key);
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('INSERT IGNORE INTO santa_message_deliveries')) {
        deliveries.push(params[2]);
        return [{ affectedRows: 1 }];
      }
      return [[]];
    });
    const first = await fulfillment.enqueueForPaidOrder('o1');
    const second = await fulfillment.enqueueForPaidOrder('o1');
    expect(first.created).toBe(2);
    expect(second.created).toBe(0);
    expect(deliveries).toEqual(['activation', 'activation']);
  });

  test('unpaid orders create nothing', async () => {
    db.query.mockResolvedValueOnce([[{ id: 'o2', status: 'pending', customer_email: 'a@b.pl' }]]);
    await expect(fulfillment.enqueueForPaidOrder('o2')).resolves.toEqual({ created: 0 });
  });
});

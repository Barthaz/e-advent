jest.mock('../../config/database', () => ({
  query: jest.fn(),
  withNamedLocks: jest.fn((keys, fn) => fn()),
}));

const db = require('../../config/database');
const {
  allocateGeneratorCertificateNumber,
  readStoredGeneratorNumber,
  buildCertificateTasks,
} = require('../../services/certificate/generatorSerial');

describe('generator certificate serial', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.withNamedLocks.mockImplementation((keys, fn) => {
      expect(keys).toEqual(['certificate-serial-gen']);
      return fn();
    });
  });

  test('reuses a number already stored on generator tasks', async () => {
    await expect(allocateGeneratorCertificateNumber([{ certificateNumber: 9 }])).resolves.toBe(9);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('assigns the next GEN number from calendars.origin=generator only', async () => {
    db.query.mockResolvedValueOnce([[{ max_n: 4 }]]);
    await expect(allocateGeneratorCertificateNumber([])).resolves.toBe(5);
    expect(db.query.mock.calls[0][0]).toMatch(/origin = 'generator'/);
    expect(db.query.mock.calls[0][0]).not.toMatch(/order_items/);
    expect(db.query.mock.calls[0][1]).toEqual(['santa-certificate']);
  });

  test('readStoredGeneratorNumber ignores junk', () => {
    expect(readStoredGeneratorNumber([{ certificateNumber: 'nope' }])).toBeNull();
    expect(readStoredGeneratorNumber([{ certificateNumber: 3 }])).toBe(3);
  });

  test('buildCertificateTasks stores name, variant and serial', () => {
    expect(buildCertificateTasks({ childName: 'Kasia', variant: 'ona', certificateNumber: 2 })).toEqual([
      { childName: 'Kasia', variant: 'ona', certificateNumber: 2 },
    ]);
  });
});

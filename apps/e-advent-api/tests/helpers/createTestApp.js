const request = require('supertest');

function loadApp() {
  // eslint-disable-next-line global-require
  return require('../../app');
}

function pendingCalendar(overrides = {}) {
  const id = overrides.id || 'cal-pending-001';
  const dataOverrides = overrides.data || {};
  const sku = dataOverrides.sku || overrides.sku || 'scratch-a3';
  const productType = dataOverrides.productType
    || (String(sku).startsWith('scratch') ? 'scratch' : 'interactive');

  return {
    _id: id,
    id,
    status: overrides.status || 'pending',
    accessCode: overrides.accessCode ?? null,
    editToken: overrides.editToken ?? 'test-edit-token',
    isFree: overrides.isFree || false,
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    data: {
      title: 'Test Calendar',
      author: 'Tester',
      email: 'buyer@example.com',
      productType,
      sku,
      format: sku === 'scratch-a3' ? 'A3' : sku === 'scratch-a4' ? 'A4' : null,
      tasks: [{ day: 1, title: 'Task', status: 'closed' }],
      ...dataOverrides,
      sku,
      productType,
    },
  };
}

const commonMocks = `
jest.mock('../../config/database', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  getPool: jest.fn(() => ({
    getConnection: jest.fn().mockResolvedValue({
      ping: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    }),
  })),
  query: jest.fn().mockResolvedValue([[], []]),
  withTransaction: jest.fn(),
  closeConnection: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../models/Calendar');
jest.mock('../../models/Payment');
jest.mock('../../config/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
}));
jest.mock('../../config/stripe', () => ({
  paymentIntents: {
    create: jest.fn(),
    update: jest.fn(),
    retrieve: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  customers: {
    list: jest.fn().mockResolvedValue({ data: [] }),
  },
}));
`;

module.exports = {
  request,
  loadApp,
  pendingCalendar,
  commonMocks,
};

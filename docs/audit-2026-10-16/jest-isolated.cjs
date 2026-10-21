// Diagnostic only: isolates security routes from the Jest/ESM PDF loader defect.
// Does not validate scratch export. Real MySQL/Stripe/SMTP are mocked by each suite.
const path = require('node:path');
const rootDir = path.resolve(__dirname, '../../apps/e-advent-api');
module.exports = {
  ...require(path.join(rootDir, 'jest.config.js')),
  rootDir,
  moduleNameMapper: {
    '^uuid$': '<rootDir>/tests/mocks/uuid.js',
    '^../services/scratch/ScratchPdfService$': path.join(__dirname, 'scratch-stub.cjs'),
  },
};

// Offline characterization of hook control flow, using mocked React hooks/API.
// A passing assertion confirms the defect; this is NOT an acceptance test.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../../apps/e-advent-frontend/src/special-windows/useSpecialProgress.ts');
const effects = [];
const states = [];
let index = 0;
const remote = { status: 'IN_PROGRESS', payload: { name: 'Saved work' }, configId: 'audit', updatedAt: '2026-10-16' };
const react = {
  useEffect: f => effects.push(f),
  useRef: v => ({ current: v }),
  useState: v => {
    const i = index++;
    states[i] = v;
    return [v, n => { states[i] = n; }];
  },
  useCallback: f => f,
};
const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const context = {
  exports: {},
  require: name => name === 'react' ? react : name === '../api/api'
    ? { getSpecialProgress: async () => ({ progress: remote }) }
    : { isPreviewCalendarId: () => false },
  localStorage: { getItem: () => null },
  setTimeout, clearTimeout, Date,
};
vm.runInNewContext(code, context);
context.exports.useSpecialProgress('audit', 1, { configId: 'audit' });
effects[0]();
setImmediate(() => {
  assert.equal(states[0].status, 'NOT_STARTED');
  console.log(JSON.stringify({ serverProgress: remote, resultingProgress: states[0], defectConfirmed: true }, null, 2));
});

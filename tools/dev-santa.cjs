'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');

const apps = path.resolve(__dirname, '../apps');
const api = path.join(apps, 'e-advent-api');
const shop = path.join(apps, 'e-advent-frontend');
const panel = path.join(apps, 'e-advent-panel');
const apiRequire = createRequire(path.join(api, 'package.json'));
const { parse } = apiRequire('dotenv');
const remote = 'https://apie-advent-test.vercel.app';
const servers = [];
let apiProcess;

function readEnv(directory) {
  const file = path.join(directory, '.env');
  return fs.existsSync(file) ? parse(fs.readFileSync(file)) : {};
}

async function startUi(root, port, definitions, proxy) {
  const appRequire = createRequire(path.join(root, 'package.json'));
  const { createServer } = await import(pathToFileURL(appRequire.resolve('vite')).href);
  const server = await createServer({
    root, mode: 'santa-preview',
    define: Object.fromEntries(Object.entries(definitions).map(([key, value]) =>
      ['import.meta.env.' + key, JSON.stringify(value)])),
    server: { host: 'localhost', port, strictPort: true, proxy: { '/api': proxy } },
  });
  servers.push(server);
  await server.listen();
}

let stopping = false;
async function stop(code) {
  if (stopping) return;
  stopping = true;
  if (apiProcess && apiProcess.exitCode === null) apiProcess.kill();
  await Promise.allSettled(servers.map(server => server.close()));
  process.exit(code);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--local-api')) throw new Error('Dozwolona opcja: --local-api');
  const local = args.includes('--local-api');
  const settings = { ...readEnv(api), ...process.env };
  const storefront = readEnv(shop);
  const stripeKey = settings.STRIPE_TEST_PUBLISHABLE_KEY || storefront.VITE_STRIPE_PUBLISHABLE_KEY_TEST || storefront.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey?.startsWith('pk_test_')) throw new Error('Uzupełnij STRIPE_TEST_PUBLISHABLE_KEY w apps/e-advent-api/.env.');
  const target = local ? 'http://127.0.0.1:3103' : remote;
  const proxy = { target, changeOrigin: true };
  if (!local && settings.SANTA_VERCEL_AUTOMATION_SECRET) {
    proxy.headers = { 'x-vercel-protection-bypass': settings.SANTA_VERCEL_AUTOMATION_SECRET };
  }
  if (local) {
    if (!settings.STRIPE_TEST_SECRET_KEY?.startsWith('sk_test_')) throw new Error('Uzupełnij STRIPE_TEST_SECRET_KEY testowego konta.');
    apiProcess = spawn(process.execPath, ['app.js'], {
      cwd: api, stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development', TESTING_MODE: 'true', LISTEN_HOST: '127.0.0.1', PORT: '3103',
        FRONTEND_URL: 'http://localhost:5183', PANEL_URL: 'http://localhost:5184',
        SANTA_DEV_MAIL_OUTBOX: settings.SANTA_DEV_MAIL_OUTBOX || 'true' },
    });
    apiProcess.once('exit', code => { if (!stopping) void stop(code ?? 1); });
  } else {
    const response = await fetch(remote + '/api/santa-messages/config', { headers: proxy.headers, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (response.status === 401 || response.status === 403 || (response.status >= 300 && response.status < 400)) {
      throw new Error('Preview Vercel wymaga dostępu. Wpisz SANTA_VERCEL_AUTOMATION_SECRET w .env API albo uruchom npm run dev:santa -- --local-api.');
    }
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Preview nie udostępnia konfiguracji Santa (HTTP ' + response.status + '). Wdróż API z bieżącej wersji.');
    const health = await fetch(remote + '/api/health', { headers: proxy.headers, redirect: 'manual', signal: AbortSignal.timeout(20000) });
    const mode = (await health.json()).mode;
    if (mode !== 'test') throw new Error('Testowe API musi mieć TESTING_MODE=true. Sprawdź środowisko Preview i wykonaj redeploy.');  }
  await startUi(shop, 5183, { VITE_API_URL: '/api', VITE_STRIPE_PUBLISHABLE_KEY: stripeKey }, proxy);
  await startUi(panel, 5184, { VITE_API_URL: '', VITE_STOREFRONT_URL: 'http://localhost:5183' }, proxy);
  console.log('API: ' + target + '\nSklep: http://localhost:5183/wiadomosc-od-mikolaja\nPanel: http://localhost:5184/santa-messages');
}
process.on('SIGINT', () => void stop(0));
process.on('SIGTERM', () => void stop(0));
main().catch(error => { console.error(error.message); void stop(1); });

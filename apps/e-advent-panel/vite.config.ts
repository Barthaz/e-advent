import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const monorepoRoot = resolve(__dirname, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const proxyTarget = env.VITE_API_PROXY_TARGET;
  if (!proxyTarget) {
    throw new Error('Missing VITE_API_PROXY_TARGET — set it in apps/e-advent-panel/.env');
  }

  return {
    plugins: [react(), tailwindcss()],
    base: '/',
    resolve: {
      alias: {
        '@e-advent/assets/brand/eadvent-logo.png': resolve(monorepoRoot, 'assets/brand/eadvent-logo.png'),
        '@e-advent/assets/brand/eadvent-mark.png': resolve(monorepoRoot, 'assets/brand/eadvent-mark.png'),
      },
    },
    server: {
      port: 5174,
      fs: {
        allow: [monorepoRoot],
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
  };
});

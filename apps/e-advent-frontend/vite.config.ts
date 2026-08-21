import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const monorepoRoot = resolve(__dirname, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'VITE_');
  const gaMeasurementId =
    env.VITE_GA_MEASUREMENT_ID ||
    (mode === 'production' ? 'G-5C07HGBQ6B' : 'G-2EK9WZNGJ1');

  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'inject-ga-measurement-id',
        transformIndexHtml(html) {
          return html.replace(/__GA_MEASUREMENT_ID__/g, gaMeasurementId);
        },
      },
      {
        name: 'copy-htaccess',
        closeBundle() {
          try {
            copyFileSync(join(__dirname, '.htaccess'), join(__dirname, 'dist', '.htaccess'));
            console.log('✓ .htaccess skopiowany do dist/');
          } catch {
            console.warn('⚠ Nie można skopiować .htaccess (może nie istnieć dla innych serwerów)');
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@e-advent/assets/background.png': resolve(monorepoRoot, 'assets/background.png'),
        '@e-advent/assets/logo.png': resolve(monorepoRoot, 'assets/brand/eadvent-logo.png'),
        '@e-advent/assets/brand/eadvent-logo.png': resolve(monorepoRoot, 'assets/brand/eadvent-logo.png'),
        '@e-advent/assets/brand/eadvent-mark.png': resolve(monorepoRoot, 'assets/brand/eadvent-mark.png'),
        '@e-advent/assets/backgrounds/christmas-ambient-portrait.webp': resolve(
          monorepoRoot,
          'assets/backgrounds/christmas-ambient-portrait.webp'
        ),
        '@e-advent/content': resolve(monorepoRoot, 'packages/content'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
      fs: {
        allow: [monorepoRoot],
      },
      headers: {
        'Content-Security-Policy': "frame-ancestors 'self' http://localhost:5174 http://127.0.0.1:5174",
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  };
});

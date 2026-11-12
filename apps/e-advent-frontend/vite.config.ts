import { defineConfig } from 'vite';
import { previewSeo } from './scripts/preview-seo.mjs';
import { prerender } from './scripts/prerender.mjs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const monorepoRoot = resolve(__dirname, '../..');

export default defineConfig(({ mode, isSsrBuild }) => {
  return {
    base: '/',
    plugins: [
      { name: 'preview-seo-documents', configurePreviewServer: previewSeo },
      react(),
      tailwindcss(),
      {
        name: 'prerender-public-pages',
        apply: 'build',
        async writeBundle(options) {
          if (isSsrBuild || !options.dir) return;
          copyFileSync(join(__dirname, '.htaccess'), join(options.dir, '.htaccess'));
          await prerender(__dirname, mode, options.dir);
        },
      },
    ],
    resolve: {
      alias: {
        '@e-advent/assets/background.png': resolve(monorepoRoot, 'assets/background.png'),
        '@e-advent/assets/logo.png': resolve(monorepoRoot, 'assets/brand/eadvent-logo.png'),
        '@e-advent/assets/brand/eadvent-logo.png': resolve(monorepoRoot, 'assets/brand/eadvent-logo.png'),
        '@e-advent/assets/brand/eadvent-logo-name.png': resolve(monorepoRoot, 'assets/brand/eadvent-logo-name.png'),
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
        'Content-Security-Policy': "frame-ancestors 'self' https://panel.e-advent.pl http://localhost:5174 http://127.0.0.1:5174",
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  };
});

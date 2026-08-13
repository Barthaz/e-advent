import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(root, '../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@e-advent/assets/background.png': path.resolve(monorepoRoot, 'assets/background.png'),
      '@e-advent/assets/logo.png': path.resolve(monorepoRoot, 'assets/logo.png'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    server: {
      deps: {
        inline: ['@e-advent/products', '@e-advent/types'],
      },
    },
  },
});

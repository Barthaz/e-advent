import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync('C:/workspace/projects/temp/index.php', 'utf8');
const m = src.match(/const WORLD_PATH = "([^"]+)"/);
if (!m) {
  console.error('WORLD_PATH not found');
  process.exit(1);
}

const outDir = path.join(__dirname, '../src/data');
fs.mkdirSync(outDir, { recursive: true });
const content = `/** Equirectangular world coastline path for Santa map (viewBox 0 0 1000 500) */
export const WORLD_PATH = ${JSON.stringify(m[1])};
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 500;
`;
fs.writeFileSync(path.join(outDir, 'worldPath.ts'), content);
console.log('Wrote worldPath.ts, path length:', m[1].length);

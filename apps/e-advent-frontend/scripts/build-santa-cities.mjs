/**
 * Build Santa city database from GeoNames dumps.
 *
 * Downloads:
 *   - PL.zip (all Polish places) → PPL* feature codes (cities & villages)
 *   - cities5000.zip (world cities pop ≥ 5000)
 *
 * Output:
 *   public/data/santa-cities.json  — compact array [id, name, country, lat, lon]
 *   public/data/santa-cities-meta.json — counts + generatedAt
 *
 * Usage: node scripts/build-santa-cities.mjs
 * Optional: SKIP_DOWNLOAD=1 to rebuild from cached .cache/geonames/
 */
import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CACHE = path.join(ROOT, '.cache', 'geonames');
const OUT_DIR = path.join(ROOT, 'public', 'data');

const PL_ZIP = 'https://download.geonames.org/export/dump/PL.zip';
const WORLD_ZIP = 'https://download.geonames.org/export/dump/cities5000.zip';

const NORTH_POLE = {
  id: 0,
  name: 'Biegun Północny',
  country: 'Laponia',
  lat: 68.07,
  lon: 27.03,
};

const COUNTRY_NAMES = {
  PL: 'Polska',
  FI: 'Finlandia',
  DE: 'Niemcy',
  FR: 'Francja',
  GB: 'Wielka Brytania',
  US: 'USA',
  CA: 'Kanada',
  BR: 'Brazylia',
  AU: 'Australia',
  JP: 'Japonia',
  CN: 'Chiny',
  IN: 'Indie',
  IT: 'Włochy',
  ES: 'Hiszpania',
  UA: 'Ukraina',
  CZ: 'Czechy',
  SK: 'Słowacja',
  LT: 'Litwa',
  LV: 'Łotwa',
  EE: 'Estonia',
  SE: 'Szwecja',
  NO: 'Norwegia',
  DK: 'Dania',
  NL: 'Holandia',
  BE: 'Belgia',
  AT: 'Austria',
  CH: 'Szwajcaria',
  HU: 'Węgry',
  RO: 'Rumunia',
  PT: 'Portugalia',
  IE: 'Irlandia',
  MX: 'Meksyk',
  AR: 'Argentyna',
  CL: 'Chile',
  NZ: 'Nowa Zelandia',
  KR: 'Korea Południowa',
  TH: 'Tajlandia',
  VN: 'Wietnam',
  PH: 'Filipiny',
  ID: 'Indonezja',
  MY: 'Malezja',
  SG: 'Singapur',
  ZA: 'RPA',
  EG: 'Egipt',
  TR: 'Turcja',
  GR: 'Grecja',
  RU: 'Rosja',
};

function countryName(code) {
  return COUNTRY_NAMES[code] || code;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function download(url, dest) {
  if (fs.existsSync(dest) && process.env.SKIP_DOWNLOAD === '1') {
    console.log('Skip download (cached):', dest);
    return;
  }
  console.log('Downloading', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  console.log('Saved', dest);
}

function unzipTo(zipPath, outDir) {
  ensureDir(outDir);
  // Use PowerShell Expand-Archive or unzip
  try {
    execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${outDir}' -Force"`, {
      stdio: 'inherit',
    });
  } catch {
    execSync(`unzip -o "${zipPath}" -d "${outDir}"`, { stdio: 'inherit' });
  }
}

function parseGeoNamesTxt(filePath, { countryFilter = null, featurePrefix = 'PPL', minPop = 0 } = {}) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const cities = [];
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const cols = line.split('\t');
    if (cols.length < 15) continue;
    const name = cols[1];
    const asciiname = cols[2];
    const lat = parseFloat(cols[4]);
    const lon = parseFloat(cols[5]);
    const featureClass = cols[6];
    const featureCode = cols[7];
    const country = cols[8];
    const pop = parseInt(cols[14], 10) || 0;

    if (featureClass !== 'P') continue;
    if (featurePrefix && !featureCode.startsWith(featurePrefix.replace('*', ''))) {
      // PPL* means starts with PPL
      if (!(featurePrefix.endsWith('*') && featureCode.startsWith(featurePrefix.slice(0, -1)))) {
        if (featurePrefix !== featureCode) continue;
      }
    }
    if (countryFilter && country !== countryFilter) continue;
    if (minPop > 0 && pop < minPop) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (!name) continue;

    cities.push({
      name,
      asciiname,
      country,
      lat,
      lon,
      pop,
      featureCode,
    });
  }
  return cities;
}

function dedupeKey(c) {
  return `${c.country}|${c.name.toLowerCase()}|${c.lat.toFixed(2)}|${c.lon.toFixed(2)}`;
}

function buildDataset(plCities, worldCities) {
  const seen = new Set();
  const result = [];

  // North Pole first
  result.push({ ...NORTH_POLE });

  const add = (c) => {
    const key = dedupeKey(c);
    if (seen.has(key)) return;
    // Also skip near-duplicate coords
    const coarse = `${c.country}|${c.lat.toFixed(1)}|${c.lon.toFixed(1)}|${c.name.slice(0, 4).toLowerCase()}`;
    if (seen.has(coarse) && c.country !== 'PL') return;
    seen.add(key);
    seen.add(coarse);
    result.push({
      id: 0, // assigned later
      name: c.name,
      country: countryName(c.country),
      lat: Math.round(c.lat * 10000) / 10000,
      lon: Math.round(c.lon * 10000) / 10000,
      _pop: c.pop || 0,
      _cc: c.country,
    });
  };

  // All PL villages/cities
  for (const c of plCities) add(c);

  // World (exclude PL — already dense)
  for (const c of worldCities) {
    if (c.country === 'PL') continue;
    add(c);
  }

  // Sort east → west (desc lon), keep North Pole first
  const [pole, ...rest] = result;
  rest.sort((a, b) => b.lon - a.lon);
  const ordered = [pole, ...rest];
  ordered.forEach((c, i) => {
    c.id = i;
  });
  return ordered;
}

async function main() {
  ensureDir(CACHE);
  ensureDir(OUT_DIR);

  const plZip = path.join(CACHE, 'PL.zip');
  const worldZip = path.join(CACHE, 'cities5000.zip');

  await download(PL_ZIP, plZip);
  await download(WORLD_ZIP, worldZip);

  const plDir = path.join(CACHE, 'PL');
  const worldDir = path.join(CACHE, 'cities5000');
  unzipTo(plZip, plDir);
  unzipTo(worldZip, worldDir);

  const plTxt = path.join(plDir, 'PL.txt');
  const worldTxt = fs.existsSync(path.join(worldDir, 'cities5000.txt'))
    ? path.join(worldDir, 'cities5000.txt')
    : path.join(CACHE, 'cities5000.txt');

  // cities5000.zip extracts to cities5000.txt in destination or cwd-relative
  let worldPath = worldTxt;
  if (!fs.existsSync(worldPath)) {
    const candidates = [
      path.join(worldDir, 'cities5000.txt'),
      path.join(CACHE, 'cities5000.txt'),
      path.join(CACHE, 'cities5000', 'cities5000.txt'),
    ];
    worldPath = candidates.find((p) => fs.existsSync(p));
    if (!worldPath) {
      // list cache
      console.log('Cache listing:', fs.readdirSync(CACHE));
      throw new Error('cities5000.txt not found after unzip');
    }
  }

  console.log('Parsing PL…');
  const plRaw = parseGeoNamesTxt(plTxt, { countryFilter: 'PL', featurePrefix: 'PPL*' });
  console.log('PL places:', plRaw.length);

  console.log('Parsing world cities5000…');
  const worldRaw = parseGeoNamesTxt(worldPath, { featurePrefix: 'PPL*', minPop: 5000 });
  console.log('World cities:', worldRaw.length);

  const dataset = buildDataset(plRaw, worldRaw);
  console.log('Total route points:', dataset.length);

  // Compact: [id, name, country, lat, lon]
  const compact = dataset.map((c) => [c.id, c.name, c.country, c.lat, c.lon]);

  const outFile = path.join(OUT_DIR, 'santa-cities.json');
  fs.writeFileSync(outFile, JSON.stringify(compact));
  fs.writeFileSync(
    path.join(OUT_DIR, 'santa-cities-meta.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: dataset.length,
        poland: dataset.filter((c) => c._cc === 'PL' || c.country === 'Polska').length,
        source: ['GeoNames PL.zip', 'GeoNames cities5000.zip'],
      },
      null,
      2,
    ),
  );

  const sizeMb = (fs.statSync(outFile).size / (1024 * 1024)).toFixed(2);
  console.log(`Wrote ${outFile} (${sizeMb} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

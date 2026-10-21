'use strict';

const fs = require('fs');
const path = require('path');
const { sniffImageFormat, isPdfSafeImageFormat } = require('../imageFormat');

const SCRATCH_ASSETS_DIR = path.resolve(__dirname, '../../assets/scratch');
const PRESETS_DIR = path.join(SCRATCH_ASSETS_DIR, 'presets');
const GRAPHICS_DIR = path.join(SCRATCH_ASSETS_DIR, 'graphics');
const DAYS_DIR = path.join(GRAPHICS_DIR, 'days');

const PRESET_NAMES = new Set(['green', 'red', 'blue']);

const GRAPHIC_FILES = {
  logo: 'logo.png',
  powody: '24_powody.png',
  odkrywaj: 'odkrywaj_codziennie.png',
  windowBox: 'window_box.png',
  heart: 'heart.png',
};

/**
 * Absolute path to a named scratch graphic (logo, headers, window box, …).
 * @param {keyof typeof GRAPHIC_FILES} name
 */
function getGraphicPath(name) {
  const file = GRAPHIC_FILES[name];
  if (!file) {
    const err = new Error(`Nieznana grafika scratch: ${name}`);
    err.status = 500;
    err.code = 'SCRATCH_GRAPHIC_UNKNOWN';
    throw err;
  }
  return path.join(GRAPHICS_DIR, file);
}

/**
 * Absolute path to day number badge 1..24.
 * @param {number} day
 */
function getDayBadgePath(day) {
  const n = Math.floor(Number(day));
  if (!Number.isFinite(n) || n < 1 || n > 24) {
    const err = new Error(`Nieprawidłowy numer dnia: ${day}`);
    err.status = 500;
    err.code = 'SCRATCH_DAY_INVALID';
    throw err;
  }
  return path.join(DAYS_DIR, `${n}.png`);
}

function assertGraphicsPresent() {
  for (const key of Object.keys(GRAPHIC_FILES)) {
    const filePath = getGraphicPath(/** @type {keyof typeof GRAPHIC_FILES} */ (key));
    if (!fs.existsSync(filePath)) {
      const err = new Error(`Brak grafiki scratch: ${GRAPHIC_FILES[key]}`);
      err.status = 500;
      err.code = 'SCRATCH_GRAPHIC_MISSING';
      throw err;
    }
  }
  for (let day = 1; day <= 24; day += 1) {
    const filePath = getDayBadgePath(day);
    if (!fs.existsSync(filePath)) {
      const err = new Error(`Brak grafiki numeru dnia: ${day}.png`);
      err.status = 500;
      err.code = 'SCRATCH_GRAPHIC_MISSING';
      throw err;
    }
  }
}

/**
 * Extract preset name from relative or absolute design URLs used by the storefront.
 * e.g. /designs/scratch/green.png, https://example.com/designs/scratch/red.png
 */
function matchPresetName(designUrl) {
  if (!designUrl || typeof designUrl !== 'string') return null;
  const normalized = designUrl.trim();
  const match = normalized.match(/(?:^|\/)designs\/scratch\/([a-z0-9_-]+)\.(?:png|jpe?g|webp)(?:\?|$)/i);
  if (match && PRESET_NAMES.has(match[1].toLowerCase())) {
    return match[1].toLowerCase();
  }
  const bare = normalized.match(/^([a-z0-9_-]+)\.(?:png|jpe?g|webp)$/i);
  if (bare && PRESET_NAMES.has(bare[1].toLowerCase())) {
    return bare[1].toLowerCase();
  }
  return null;
}

function readLocalPreset(name) {
  const filePath = path.join(PRESETS_DIR, `${name}.png`);
  if (!fs.existsSync(filePath)) {
    const err = new Error(`Brak lokalnego presetu scratch: ${name}`);
    err.status = 500;
    err.code = 'SCRATCH_PRESET_MISSING';
    throw err;
  }
  return fs.readFileSync(filePath);
}

const { readPdfImage: fetchRemoteImage } = require('../pdfImageSource');

/**
 * Resolve calendar design_url to an image buffer suitable for PDF (jpeg/png).
 * @param {string|null|undefined} designUrl
 * @returns {Promise<{ buffer: Buffer, format: string }>}
 */
async function resolveScratchDesignImage(designUrl) {
  if (!designUrl || typeof designUrl !== 'string' || !designUrl.trim()) {
    const err = new Error('Kalendarz nie ma przypisanej grafiki designu');
    err.status = 422;
    err.code = 'SCRATCH_DESIGN_MISSING';
    throw err;
  }

  const trimmed = designUrl.trim();
  const preset = matchPresetName(trimmed);
  let buffer;

  if (preset) {
    buffer = readLocalPreset(preset);
  } else if (/^https?:\/\//i.test(trimmed)) {
    buffer = await fetchRemoteImage(trimmed);
  } else if (trimmed.startsWith('/')) {
    const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    if (!base) {
      const err = new Error('Nie można rozwiązać względnej ścieżki designu (brak FRONTEND_URL)');
      err.status = 422;
      err.code = 'SCRATCH_DESIGN_UNRESOLVABLE';
      throw err;
    }
    buffer = await fetchRemoteImage(`${base}${trimmed}`);
  } else {
    const err = new Error('Nieobsługiwany format URL designu kalendarza');
    err.status = 422;
    err.code = 'SCRATCH_DESIGN_UNRESOLVABLE';
    throw err;
  }

  const format = sniffImageFormat(buffer);
  if (!format || !isPdfSafeImageFormat(format)) {
    const err = new Error('Grafika designu musi być w formacie JPEG lub PNG');
    err.status = 422;
    err.code = 'SCRATCH_DESIGN_FORMAT';
    throw err;
  }

  if (!preset) return require('../pdfImageSource').normalizePdfImage(buffer);
  return { buffer, format };
}

module.exports = {
  SCRATCH_ASSETS_DIR,
  GRAPHICS_DIR,
  DAYS_DIR,
  GRAPHIC_FILES,
  getGraphicPath,
  getDayBadgePath,
  assertGraphicsPresent,
  matchPresetName,
  resolveScratchDesignImage,
};

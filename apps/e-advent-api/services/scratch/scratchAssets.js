'use strict';

const fs = require('fs');
const path = require('path');
const { sniffImageFormat, isPdfSafeImageFormat } = require('../imageFormat');

const SCRATCH_ASSETS_DIR = path.resolve(__dirname, '../../assets/scratch');
const TEMPLATE_PATH = path.join(SCRATCH_ASSETS_DIR, 'template.png');
const PRESETS_DIR = path.join(SCRATCH_ASSETS_DIR, 'presets');

const PRESET_NAMES = new Set(['green', 'red', 'blue']);

function getTemplatePath() {
  return TEMPLATE_PATH;
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

async function fetchRemoteImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const err = new Error(`Nie udało się pobrać grafiki designu (${res.status})`);
      err.status = 422;
      err.code = 'SCRATCH_DESIGN_FETCH_FAILED';
      throw err;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    if (error.code === 'SCRATCH_DESIGN_FETCH_FAILED') throw error;
    const err = new Error(error.name === 'AbortError'
      ? 'Timeout podczas pobierania grafiki designu'
      : `Nie udało się pobrać grafiki designu: ${error.message}`);
    err.status = 422;
    err.code = 'SCRATCH_DESIGN_FETCH_FAILED';
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

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
    // Relative storefront path that is not a known preset — try FRONTEND_URL
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

  return { buffer, format };
}

module.exports = {
  SCRATCH_ASSETS_DIR,
  getTemplatePath,
  matchPresetName,
  resolveScratchDesignImage,
};

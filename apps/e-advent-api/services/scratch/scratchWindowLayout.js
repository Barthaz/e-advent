'use strict';

/** Logical canvas matching template.png aspect (1024×1536). */
const LOGICAL_WIDTH = 1024;
const LOGICAL_HEIGHT = 1536;
const COLS = 4;

/** Fixed window size (logical px). */
const CELL_WIDTH = 210;
const CELL_HEIGHT = 100;
const GAP_X = 26;
const GAP_Y = 64;

/** Center the 4-column strip horizontally. */
const MARGIN_X = (LOGICAL_WIDTH - (COLS * CELL_WIDTH + (COLS - 1) * GAP_X)) / 2;

/**
 * Vertical placement — row 1 calibrated; keep when tweaking height/gap.
 */
const MARGIN_TOP = 438;

/**
 * @typedef {{ day: number, x: number, y: number, width: number, height: number }} WindowBox
 */

/**
 * Build a 4-column grid of window boxes for sequential days 1..N.
 * Coordinates are in logical canvas units (1024×1536).
 *
 * @param {number} taskCount
 * @returns {WindowBox[]}
 */
function buildWindowBoxes(taskCount) {
  const n = Math.max(0, Math.floor(Number(taskCount) || 0));
  if (n === 0) return [];

  const boxes = [];
  for (let i = 0; i < n; i += 1) {
    const day = i + 1;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    boxes.push({
      day,
      x: MARGIN_X + col * (CELL_WIDTH + GAP_X),
      y: MARGIN_TOP + row * (CELL_HEIGHT + GAP_Y),
      width: CELL_WIDTH,
      height: CELL_HEIGHT,
    });
  }
  return boxes;
}

/**
 * Map a logical box to PDF page points.
 * @param {WindowBox} box
 * @param {{ width: number, height: number }} pageSize
 */
function scaleBoxToPage(box, pageSize) {
  const sx = pageSize.width / LOGICAL_WIDTH;
  const sy = pageSize.height / LOGICAL_HEIGHT;
  return {
    day: box.day,
    x: box.x * sx,
    y: box.y * sy,
    width: box.width * sx,
    height: box.height * sy,
  };
}

/** Page size in PDF points (1 pt = 1/72"). */
function pageSizePoints(format) {
  const sizes = {
    A5: { width: 419.53, height: 595.28 },
    A4: { width: 595.28, height: 841.89 },
    A3: { width: 841.89, height: 1190.55 },
  };
  const key = String(format || 'A4').toUpperCase();
  return sizes[key] || sizes.A4;
}

/**
 * Pixel dimensions for raster export.
 * @param {string} format A5|A4|A3
 * @param {number} dpi
 */
function pageSizePixels(format, dpi) {
  const mm = {
    A5: { w: 148, h: 210 },
    A4: { w: 210, h: 297 },
    A3: { w: 297, h: 420 },
  };
  const key = String(format || 'A4').toUpperCase();
  const size = mm[key] || mm.A4;
  const d = Number(dpi) || 300;
  return {
    width: Math.round((size.w / 25.4) * d),
    height: Math.round((size.h / 25.4) * d),
  };
}

function normalizeExportFormat(format) {
  const key = String(format || 'A4').toUpperCase();
  if (key === 'A5' || key === 'A4' || key === 'A3') return key;
  return 'A4';
}

function normalizeDpi(dpi) {
  const n = Number(dpi);
  if (n === 300) return 300;
  if (n === 600) return 600;
  return 600;
}

module.exports = {
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  COLS,
  MARGIN_X,
  MARGIN_TOP,
  GAP_X,
  GAP_Y,
  CELL_WIDTH,
  CELL_HEIGHT,
  buildWindowBoxes,
  scaleBoxToPage,
  pageSizePoints,
  pageSizePixels,
  normalizeExportFormat,
  normalizeDpi,
};

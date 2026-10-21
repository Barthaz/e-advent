'use strict';

/** Source aspect ratios of scratch graphics (width / height). */
const LOGO_ASPECT = 1254 / 1254;
const POWODY_ASPECT = 2172 / 198;
const ODKRYWAJ_ASPECT = 2172 / 443;
const HEART_ASPECT = 2172 / 293;
const WINDOW_BOX_ASPECT = 1362 / 954;

const COLS = 4;
const ROWS = 6;
const MAX_DAYS = COLS * ROWS;

/**
 * Tunable layout fractions (relative to page height / width).
 * Adjust these while calibrating the printed look.
 */
const LAYOUT = {
  /** Base white frame around the whole page (fraction of min page side). */
  pageWhiteBorder: 0.025 * 2 * 0.3,
  /** Per-side multipliers relative to pageWhiteBorder. */
  pageWhiteBorderLeft: 0.5,
  pageWhiteBorderTop: 0.7,
  pageWhiteBorderRight: 0.7,
  pageWhiteBorderBottom: 0.7,
  padX: 0.045,
  padTop: 0.03,
  padBottom: 0.022,
  logoHeight: 0.115,
  afterLogoGap: 0.01,
  /** Combined height for 24_powody + odkrywaj_codziennie (+ small gap). */
  headersBudget: 0.095,
  /** Relative visual weight: powody larger than odkrywaj (but less dominant). */
  powodyWeight: 1.25,
  odkrywajWeight: 1,
  headersInnerGapFrac: 0.1,
  headerMaxWidth: 0.88,
  /** Small heart under odkrywaj_codziennie. */
  heartHeight: 0.018,
  afterOdkrywajGap: 0.006,
  afterHeartGap: 0.012,
  /** Day badge size relative to window cell width. */
  badgeSizeFrac: 0.171,
  /** How much of the badge sits above the window box. */
  badgeOverhangFrac: 0.42,
  /** Horizontal / vertical gaps between window boxes (equal look). */
  gridGapMinFrac: 0.012,
  textPadFrac: 0.08,
};

/**
 * @typedef {{ x: number, y: number, width: number, height: number }} Rect
 * @typedef {Rect & { day: number, badge: Rect, text: Rect }} WindowCell
 * @typedef {{
 *   page: { width: number, height: number },
 *   border: { left: number, top: number, right: number, bottom: number },
 *   design: Rect,
 *   logo: Rect,
 *   powody: Rect,
 *   odkrywaj: Rect,
 *   heart: Rect,
 *   windows: WindowCell[],
 * }} ScratchLayout
 */

function fitCentered(y, height, aspect, pageWidth, maxWidthFrac) {
  let width = height * aspect;
  const maxW = pageWidth * maxWidthFrac;
  if (width > maxW) {
    width = maxW;
    height = width / aspect;
  }
  return {
    x: (pageWidth - width) / 2,
    y,
    width,
    height,
  };
}

function offsetRect(rect, ox, oy) {
  return {
    ...rect,
    x: rect.x + ox,
    y: rect.y + oy,
  };
}

/**
 * Compute absolute page-point layout for scratch PDF (design + graphics composition).
 * Always prepares slots for days 1..24 (4×6); callers may leave empty slots blank.
 *
 * @param {{ width: number, height: number }} pageSize
 * @returns {ScratchLayout}
 */
function computeScratchLayout(pageSize) {
  const pageW = pageSize.width;
  const pageH = pageSize.height;
  const baseBorder = Math.min(pageW, pageH) * LAYOUT.pageWhiteBorder;
  const border = {
    left: baseBorder * LAYOUT.pageWhiteBorderLeft,
    top: baseBorder * LAYOUT.pageWhiteBorderTop,
    right: baseBorder * LAYOUT.pageWhiteBorderRight,
    bottom: baseBorder * LAYOUT.pageWhiteBorderBottom,
  };
  const ox = border.left;
  const oy = border.top;
  const W = pageW - border.left - border.right;
  const H = pageH - border.top - border.bottom;
  const design = { x: ox, y: oy, width: W, height: H };

  const padX = W * LAYOUT.padX;
  const padTop = H * LAYOUT.padTop;
  const padBottom = H * LAYOUT.padBottom;

  const logoH = H * LAYOUT.logoHeight;
  const logoW = logoH * LOGO_ASPECT;
  const logoLocal = {
    x: (W - logoW) / 2,
    y: padTop,
    width: logoW,
    height: logoH,
  };

  let cursorY = logoLocal.y + logoLocal.height + H * LAYOUT.afterLogoGap;

  const headersBudget = H * LAYOUT.headersBudget;
  const headersGap = headersBudget * LAYOUT.headersInnerGapFrac;
  const usableHeaders = headersBudget - headersGap;
  const weightSum = LAYOUT.powodyWeight + LAYOUT.odkrywajWeight;
  const powodyH = usableHeaders * (LAYOUT.powodyWeight / weightSum);
  const odkrywajH = usableHeaders * (LAYOUT.odkrywajWeight / weightSum);

  const powodyLocal = fitCentered(cursorY, powodyH, POWODY_ASPECT, W, LAYOUT.headerMaxWidth);
  cursorY = powodyLocal.y + powodyLocal.height + headersGap;
  const odkrywajLocal = fitCentered(cursorY, odkrywajH, ODKRYWAJ_ASPECT, W, LAYOUT.headerMaxWidth);
  cursorY = odkrywajLocal.y + odkrywajLocal.height + H * LAYOUT.afterOdkrywajGap;

  const heartLocal = fitCentered(
    cursorY,
    H * LAYOUT.heartHeight,
    HEART_ASPECT,
    W,
    LAYOUT.headerMaxWidth,
  );
  cursorY = heartLocal.y + heartLocal.height + H * LAYOUT.afterHeartGap;

  const gridTop = cursorY;
  const gridBottom = H - padBottom;
  const availW = W - 2 * padX;
  const availH = Math.max(0, gridBottom - gridTop);

  const gapGuess = Math.max(W, H) * LAYOUT.gridGapMinFrac;
  let gap = gapGuess;
  let cellW;
  let cellH;
  let overhang;

  for (let i = 0; i < 8; i += 1) {
    cellW = (availW - (COLS - 1) * gap) / COLS;
    cellH = cellW / WINDOW_BOX_ASPECT;
    const badge = cellW * LAYOUT.badgeSizeFrac;
    overhang = badge * LAYOUT.badgeOverhangFrac;
    const neededH = overhang + ROWS * cellH + (ROWS - 1) * gap;
    if (neededH <= availH || cellW <= 1) break;
    const heightForBoxes = availH - overhang - (ROWS - 1) * gap;
    cellH = Math.max(1, heightForBoxes / ROWS);
    cellW = cellH * WINDOW_BOX_ASPECT;
    const widthUsed = COLS * cellW + (COLS - 1) * gap;
    if (widthUsed > availW) {
      cellW = (availW - (COLS - 1) * gap) / COLS;
      cellH = cellW / WINDOW_BOX_ASPECT;
    }
    overhang = cellW * LAYOUT.badgeSizeFrac * LAYOUT.badgeOverhangFrac;
    const usedH = overhang + ROWS * cellH + (ROWS - 1) * gap;
    if (usedH < availH) {
      gap += (availH - usedH) / (ROWS + COLS);
    }
  }

  const badgeSize = cellW * LAYOUT.badgeSizeFrac;
  overhang = badgeSize * LAYOUT.badgeOverhangFrac;
  const gridBlockW = COLS * cellW + (COLS - 1) * gap;
  const gridBlockH = overhang + ROWS * cellH + (ROWS - 1) * gap;
  const gridOriginX = padX + Math.max(0, (availW - gridBlockW) / 2);
  const gridOriginY = gridTop + Math.max(0, (availH - gridBlockH) / 2);

  const textPad = Math.min(cellW, cellH) * LAYOUT.textPadFrac;
  const windows = [];

  for (let i = 0; i < MAX_DAYS; i += 1) {
    const day = i + 1;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = gridOriginX + col * (cellW + gap);
    const y = gridOriginY + overhang + row * (cellH + gap);
    const badge = {
      x: x + (cellW - badgeSize) / 2,
      y: y - overhang,
      width: badgeSize,
      height: badgeSize,
    };
    const cellLocal = {
      day,
      x,
      y,
      width: cellW,
      height: cellH,
      badge,
      text: {
        x: x + textPad,
        y: y + textPad + badgeSize * (1 - LAYOUT.badgeOverhangFrac) * 0.35,
        width: cellW - 2 * textPad,
        height: Math.max(
          8,
          cellH - 2 * textPad - badgeSize * (1 - LAYOUT.badgeOverhangFrac) * 0.45,
        ),
      },
    };
    windows.push({
      ...offsetRect(cellLocal, ox, oy),
      day: cellLocal.day,
      badge: offsetRect(cellLocal.badge, ox, oy),
      text: offsetRect(cellLocal.text, ox, oy),
    });
  }

  return {
    page: { width: pageW, height: pageH },
    border,
    design,
    logo: offsetRect(logoLocal, ox, oy),
    powody: offsetRect(powodyLocal, ox, oy),
    odkrywaj: offsetRect(odkrywajLocal, ox, oy),
    heart: offsetRect(heartLocal, ox, oy),
    windows,
  };
}

/** @deprecated Prefer computeScratchLayout — kept for callers expecting box list. */
function buildWindowBoxes(taskCount) {
  const n = Math.min(MAX_DAYS, Math.max(0, Math.floor(Number(taskCount) || 0)));
  // Logical stand-in using A4 points so older tests can still reason about count/order.
  const layout = computeScratchLayout(pageSizePoints('A4'));
  return layout.windows.slice(0, n).map((w) => ({
    day: w.day,
    x: w.x,
    y: w.y,
    width: w.width,
    height: w.height,
  }));
}

function scaleBoxToPage(box, pageSize) {
  // Boxes from computeScratchLayout are already in page points.
  if (pageSize && box && Number.isFinite(box.x)) {
    return { ...box };
  }
  return box;
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
  const key = String(format || 'A3').toUpperCase();
  if (key !== 'A3') throw Object.assign(new Error('Kalendarz zdrapka można generować wyłącznie w formacie A3.'), { status: 400, code: 'UNSUPPORTED_SCRATCH_FORMAT' });
  return 'A3';
}

function normalizeDpi(dpi) {
  const n = Number(dpi);
  if (n === 300) return 300;
  if (n === 600) return 600;
  return 600;
}

module.exports = {
  COLS,
  ROWS,
  MAX_DAYS,
  LAYOUT,
  LOGO_ASPECT,
  POWODY_ASPECT,
  ODKRYWAJ_ASPECT,
  HEART_ASPECT,
  WINDOW_BOX_ASPECT,
  computeScratchLayout,
  buildWindowBoxes,
  scaleBoxToPage,
  pageSizePoints,
  pageSizePixels,
  normalizeExportFormat,
  normalizeDpi,
};

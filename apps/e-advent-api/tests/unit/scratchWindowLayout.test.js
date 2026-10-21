'use strict';

const {
  computeScratchLayout,
  buildWindowBoxes,
  pageSizePoints,
  pageSizePixels,
  normalizeExportFormat,
  normalizeDpi,
  COLS,
  ROWS,
  MAX_DAYS,
  LAYOUT,
} = require('../../services/scratch/scratchWindowLayout');
const {
  matchPresetName,
  assertGraphicsPresent,
  getGraphicPath,
  getDayBadgePath,
} = require('../../services/scratch/scratchAssets');

describe('scratchWindowLayout', () => {
  test('computes logo, headers and 4×6 window grid on A4', () => {
    const layout = computeScratchLayout(pageSizePoints('A4'));
    const { height: H, width: W } = layout.page;

    expect(layout.logo.height).toBeCloseTo(
      layout.design.height * LAYOUT.logoHeight,
      5,
    );
    expect(layout.logo.x + layout.logo.width / 2).toBeCloseTo(
      layout.design.x + layout.design.width / 2,
      1,
    );
    const baseBorder = Math.min(W, H) * LAYOUT.pageWhiteBorder;
    expect(layout.border.left).toBeCloseTo(baseBorder * LAYOUT.pageWhiteBorderLeft, 5);
    expect(layout.border.top).toBeCloseTo(baseBorder * LAYOUT.pageWhiteBorderTop, 5);
    expect(layout.border.right).toBeCloseTo(baseBorder * LAYOUT.pageWhiteBorderRight, 5);
    expect(layout.border.bottom).toBeCloseTo(baseBorder * LAYOUT.pageWhiteBorderBottom, 5);
    expect(layout.design.x).toBeCloseTo(layout.border.left, 5);
    expect(layout.design.width).toBeCloseTo(W - layout.border.left - layout.border.right, 5);

    const headersSpan =
      (layout.odkrywaj.y + layout.odkrywaj.height) - layout.powody.y;
    expect(headersSpan).toBeLessThanOrEqual(
      layout.design.height * LAYOUT.headersBudget * 1.05,
    );
    expect(layout.powody.height).toBeGreaterThan(layout.odkrywaj.height);

    expect(layout.heart.height).toBeCloseTo(
      layout.design.height * LAYOUT.heartHeight,
      5,
    );
    expect(layout.heart.y).toBeGreaterThan(layout.odkrywaj.y + layout.odkrywaj.height);
    expect(layout.heart.x + layout.heart.width / 2).toBeCloseTo(
      layout.design.x + layout.design.width / 2,
      1,
    );

    expect(layout.windows).toHaveLength(MAX_DAYS);
    expect(layout.windows[0].day).toBe(1);
    expect(layout.windows[23].day).toBe(24);

    // Equal horizontal pitch within a row
    const row0 = layout.windows.slice(0, COLS);
    const pitchX = row0[1].x - row0[0].x;
    for (let i = 1; i < COLS; i += 1) {
      expect(row0[i].x - row0[i - 1].x).toBeCloseTo(pitchX, 4);
      expect(row0[i].y).toBeCloseTo(row0[0].y, 4);
    }

    // Equal vertical pitch between rows
    const pitchY = layout.windows[COLS].y - layout.windows[0].y;
    for (let r = 1; r < ROWS; r += 1) {
      expect(layout.windows[r * COLS].y - layout.windows[(r - 1) * COLS].y)
        .toBeCloseTo(pitchY, 4);
    }

    // Day badge sits partially above the box
    const cell = layout.windows[0];
    expect(cell.badge.y).toBeLessThan(cell.y);
    expect(cell.badge.y + cell.badge.height).toBeGreaterThan(cell.y);
  });

  test('buildWindowBoxes returns sequential days', () => {
    const boxes = buildWindowBoxes(24);
    expect(boxes).toHaveLength(24);
    expect(boxes[0].day).toBe(1);
    expect(boxes[5].day).toBe(6);
  });

  test('page sizes for A5/A4/A3', () => {
    expect(normalizeExportFormat('a3')).toBe('A3');
    expect(() => normalizeExportFormat('nope')).toThrow();
    expect(() => normalizeExportFormat('A4')).toThrow();
    expect(normalizeExportFormat()).toBe('A3');
    expect(pageSizePoints('A4').width).toBeCloseTo(595.28, 1);
    expect(pageSizePoints('A3').height).toBeGreaterThan(pageSizePoints('A4').height);
    expect(pageSizePoints('A5').width).toBeLessThan(pageSizePoints('A4').width);
  });

  test('pixel sizes at 300 DPI', () => {
    expect(normalizeDpi(600)).toBe(600);
    expect(normalizeDpi(300)).toBe(300);
    expect(normalizeDpi(123)).toBe(600);
    const a4 = pageSizePixels('A4', 300);
    expect(a4.width).toBe(2480);
    expect(a4.height).toBe(3508);
    const a3 = pageSizePixels('A3', 300);
    expect(a3.width).toBe(3508);
    expect(a3.height).toBe(4961);
    const a4_600 = pageSizePixels('A4', 600);
    expect(a4_600.width).toBe(4961);
    expect(a4_600.height).toBe(7016);
  });
});

describe('scratchAssets', () => {
  test('matchPresetName extracts preset from storefront paths', () => {
    expect(matchPresetName('/designs/scratch/green.png')).toBe('green');
    expect(matchPresetName('https://shop.example/designs/scratch/red.png')).toBe('red');
    expect(matchPresetName('/designs/scratch/blue.png?x=1')).toBe('blue');
    expect(matchPresetName('https://blob.example/custom.png')).toBeNull();
  });

  test('graphics and day badges are present on disk', () => {
    expect(() => assertGraphicsPresent()).not.toThrow();
    expect(getGraphicPath('logo')).toMatch(/logo\.png$/);
    expect(getDayBadgePath(1)).toMatch(/days[/\\]1\.png$/);
    expect(getDayBadgePath(24)).toMatch(/days[/\\]24\.png$/);
  });
});

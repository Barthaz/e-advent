'use strict';

const {
  buildWindowBoxes,
  pageSizePoints,
  pageSizePixels,
  normalizeExportFormat,
  normalizeDpi,
  COLS,
} = require('../../services/scratch/scratchWindowLayout');
const { matchPresetName } = require('../../services/scratch/scratchAssets');

describe('scratchWindowLayout', () => {
  test('builds 4-column sequential grid with fixed shorter height', () => {
    const boxes = buildWindowBoxes(24);
    expect(boxes).toHaveLength(24);
    expect(boxes[0]).toMatchObject({ day: 1 });
    expect(boxes[0].y).toBe(438);
    expect(boxes.every((b) => b.height === 100)).toBe(true);
    expect(boxes.every((b) => b.width === 210)).toBe(true);

    // Equal vertical pitch between rows (cell + fixed gap)
    const pitch = boxes[4].y - boxes[0].y;
    expect(pitch).toBe(100 + 64);
    expect(boxes[12].y).toBe(438 + 3 * (100 + 64));
    expect(boxes[8].y - boxes[4].y).toBeCloseTo(pitch, 5);
    expect(boxes[20].y - boxes[16].y).toBeCloseTo(pitch, 5);

    // day 1 and day 5 share column 0
    expect(boxes[0].x).toBeCloseTo(boxes[4].x, 5);

    const row0 = boxes.slice(0, COLS);
    for (let i = 1; i < COLS; i += 1) {
      expect(row0[i].x).toBeGreaterThan(row0[i - 1].x);
      expect(row0[i].y).toBeCloseTo(row0[0].y, 5);
    }
  });

  test('page sizes for A5/A4/A3', () => {
    expect(normalizeExportFormat('a3')).toBe('A3');
    expect(normalizeExportFormat('nope')).toBe('A4');
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

describe('scratchAssets.matchPresetName', () => {
  test('extracts preset from storefront paths', () => {
    expect(matchPresetName('/designs/scratch/green.png')).toBe('green');
    expect(matchPresetName('https://shop.example/designs/scratch/red.png')).toBe('red');
    expect(matchPresetName('/designs/scratch/blue.png?x=1')).toBe('blue');
    expect(matchPresetName('https://blob.example/custom.png')).toBeNull();
  });
});

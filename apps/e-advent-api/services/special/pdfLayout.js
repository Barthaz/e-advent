'use strict';

/** Keep in sync with apps/e-advent-frontend/src/special-windows/pdfLayout.ts */

const LANDSCAPE = new Set([
  'ranking-v1',
  'scorecard-v1',
  'suggestion-list-v1',
  'labels-sheet-v1',
  'coupon-sheet-v1',
  'bookmarks-v1',
  'memory-list-v1',
  'steps-summary-v1',
  'then-now-v1',
]);

const SQUARE = new Set([
  'form-card-v1',
  'greeting-card-v1',
  'postcard-v1',
  'fact-card-v1',
  'bingo-v1',
  'typographic-card-v1',
  'gratitude-card-v1',
  'memory-card-v1',
  'tradition-card-v1',
  'closure-card-v1',
]);

function defaultPdfLayout(templateId) {
  if (LANDSCAPE.has(templateId)) return 'LANDSCAPE';
  if (SQUARE.has(templateId)) return 'SQUARE';
  return 'PORTRAIT';
}

function normalizePdfLayout(value, fallback = 'PORTRAIT') {
  const upper = String(value || '').toUpperCase();
  if (upper === 'PORTRAIT' || upper === 'LANDSCAPE' || upper === 'SQUARE') return upper;
  return fallback;
}

function applyPdfLayout(page, layout) {
  const marginMm = page?.marginMm ?? 12;
  if (layout === 'SQUARE') {
    return { size: 'SQUARE', orientation: 'PORTRAIT', marginMm };
  }
  if (layout === 'LANDSCAPE') {
    const size = !page?.size || page.size === 'SQUARE' ? 'A5' : page.size;
    return { size, orientation: 'LANDSCAPE', marginMm };
  }
  const size = !page?.size || page.size === 'SQUARE' ? 'A5' : page.size;
  return { size, orientation: 'PORTRAIT', marginMm };
}

module.exports = {
  defaultPdfLayout,
  normalizePdfLayout,
  applyPdfLayout,
};

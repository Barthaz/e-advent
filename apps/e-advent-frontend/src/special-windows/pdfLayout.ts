/** Keep in sync with apps/e-advent-api/services/special/pdfLayout.js */

export type PdfLayout = 'PORTRAIT' | 'LANDSCAPE' | 'SQUARE';

export function fixedPdfLayout(templateId?: string): PdfLayout | null {
  if (templateId === 'then-now-v1') return 'LANDSCAPE';
  return new Set([
    'paper-village-v1', 'paper-reindeer-v1', 'origami-guide-v1', 'garland-v1',
    'salt-dough-guide-v1', 'stamp-guide-v1', 'envelope-decor-guide-v1', 'bookmarks-v1',
    'wrapping-pattern-v1', 'memory-chain-v1', 'comic-sheet-v1', 'coupon-sheet-v1', 'labels-sheet-v1',
  ]).has(templateId || '') ? 'PORTRAIT' : null;
}

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

export function defaultPdfLayout(templateId?: string): PdfLayout {
  const fixed = fixedPdfLayout(templateId);
  if (fixed) return fixed;
  if (!templateId) return 'PORTRAIT';
  if (LANDSCAPE.has(templateId)) return 'LANDSCAPE';
  if (SQUARE.has(templateId)) return 'SQUARE';
  return 'PORTRAIT';
}

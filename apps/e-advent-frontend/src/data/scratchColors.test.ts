import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCRATCH_COLOR_ID,
  designFromScratchColor,
  scratchColorFromDesign,
} from './scratchColors';

describe('scratch product color options', () => {
  it('maps the default color to the print preset used by API export', () => {
    const design = designFromScratchColor(DEFAULT_SCRATCH_COLOR_ID);
    expect(design.source).toBe('preset');
    expect(design.imageUrl).toBe('/designs/scratch/red.png');
    expect(scratchColorFromDesign(design).id).toBe('red');
  });

  it('round-trips green and blue presets without a custom upload', () => {
    expect(designFromScratchColor('green').imageUrl).toBe('/designs/scratch/green.png');
    expect(designFromScratchColor('blue').presetId).toBe('scratch-blue');
    expect(scratchColorFromDesign({ source: 'preset', imageUrl: '/designs/scratch/blue.png' }).label).toBe('Błękitna Noc');
  });
});

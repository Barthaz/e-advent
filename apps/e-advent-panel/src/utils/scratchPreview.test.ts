import { describe, it, expect } from 'vitest';
import { resolveScratchPreviewUrl } from './scratchPreview';

describe('resolveScratchPreviewUrl', () => {
  it('maps storefront preset paths to panel public assets', () => {
    expect(resolveScratchPreviewUrl('/designs/scratch/green.png')).toBe('/scratch/presets/green.png');
    expect(resolveScratchPreviewUrl('https://cdn.example/designs/scratch/red.png')).toBe(
      '/scratch/presets/red.png',
    );
  });

  it('passes through absolute blob URLs', () => {
    expect(resolveScratchPreviewUrl('https://blob.vercel-storage.com/x.png')).toBe(
      'https://blob.vercel-storage.com/x.png',
    );
  });

  it('returns null for empty', () => {
    expect(resolveScratchPreviewUrl(null)).toBeNull();
    expect(resolveScratchPreviewUrl('')).toBeNull();
  });
});

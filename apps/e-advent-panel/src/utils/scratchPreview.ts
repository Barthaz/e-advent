/**
 * Resolve calendar design_url for panel preview.
 * Storefront presets `/designs/scratch/X.png` map to local `/scratch/presets/X.png`.
 */
export function resolveScratchPreviewUrl(designUrl: string | null | undefined): string | null {
  if (!designUrl) return null;
  const trimmed = designUrl.trim();
  if (!trimmed) return null;

  const preset = trimmed.match(/(?:^|\/)designs\/scratch\/([a-z0-9_-]+)\.(?:png|jpe?g|webp)(?:\?|$)/i);
  if (preset) {
    return `/scratch/presets/${preset[1].toLowerCase()}.png`;
  }

  if (trimmed.startsWith('/scratch/')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return trimmed;
}

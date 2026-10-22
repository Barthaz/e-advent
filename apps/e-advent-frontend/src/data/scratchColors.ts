import type { DesignSelection } from '../types/order';

export const SCRATCH_COLOR_OPTIONS = [
  {
    id: 'green',
    label: 'Zielona Gwiazdka',
    swatch: '#1e4a32',
    presetId: 'scratch-green',
    imageUrl: '/designs/scratch/green.png',
  },
  {
    id: 'red',
    label: 'Czerwony Mikołaj',
    swatch: '#7a1c1c',
    presetId: 'scratch-red',
    imageUrl: '/designs/scratch/red.png',
  },
  {
    id: 'blue',
    label: 'Błękitna Noc',
    swatch: '#1b3b63',
    presetId: 'scratch-blue',
    imageUrl: '/designs/scratch/blue.png',
  },
] as const;

export type ScratchColorId = (typeof SCRATCH_COLOR_OPTIONS)[number]['id'];

export const DEFAULT_SCRATCH_COLOR_ID: ScratchColorId = 'red';
export const DEFAULT_SCRATCH_TITLE = 'Kalendarz zdrapka';

export function scratchColorById(id: string | null | undefined) {
  return (
    SCRATCH_COLOR_OPTIONS.find((c) => c.id === id)
    ?? SCRATCH_COLOR_OPTIONS.find((c) => c.id === DEFAULT_SCRATCH_COLOR_ID)
    ?? SCRATCH_COLOR_OPTIONS[0]
  );
}

export function scratchColorFromDesign(design: DesignSelection | null | undefined) {
  if (!design) return scratchColorById(DEFAULT_SCRATCH_COLOR_ID);
  const byPreset = SCRATCH_COLOR_OPTIONS.find((c) => c.presetId === design.presetId);
  if (byPreset) return byPreset;
  const byUrl = SCRATCH_COLOR_OPTIONS.find((c) => c.imageUrl === design.imageUrl);
  return byUrl ?? scratchColorById(DEFAULT_SCRATCH_COLOR_ID);
}

export function designFromScratchColor(id: ScratchColorId): DesignSelection {
  const color = scratchColorById(id);
  return {
    source: 'preset',
    presetId: color.presetId,
    imageUrl: color.imageUrl,
  };
}

export type ThemeId = 'CLASSIC_GREEN' | 'WARM_CREAM' | 'MIDNIGHT';

export interface EAdventTheme {
  id: ThemeId;
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    muted: string;
    gold: string;
    success: string;
    danger: string;
  };
  radii: { sm: number; md: number; lg: number };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  typography: { heading: string; body: string; accent: string };
  ornamentPreset: 'NONE' | 'CORNERS' | 'STARS' | 'EVERGREEN';
  backgroundSetId?: 'christmas-ambient';
}

export const themes: Record<ThemeId, EAdventTheme> = {
  CLASSIC_GREEN: {
    id: 'CLASSIC_GREEN',
    colors: {
      background: '#0f5132',
      surface: '#fef9f0',
      surfaceAlt: '#f5efe3',
      text: '#1a2e1f',
      muted: '#5a6358',
      gold: '#c9a227',
      success: '#2d6a4f',
      danger: '#9b2226',
    },
    radii: { sm: 4, md: 8, lg: 16 },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    typography: {
      heading: 'Cormorant Garamond, serif',
      body: 'Source Serif 4, serif',
      accent: 'Dancing Script, cursive',
    },
    ornamentPreset: 'EVERGREEN',
    backgroundSetId: 'christmas-ambient',
  },
  WARM_CREAM: {
    id: 'WARM_CREAM',
    colors: {
      background: '#3d2914',
      surface: '#fff8ee',
      surfaceAlt: '#f7ead8',
      text: '#2c1810',
      muted: '#6b5344',
      gold: '#b8860b',
      success: '#386641',
      danger: '#9b2226',
    },
    radii: { sm: 4, md: 8, lg: 12 },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    typography: {
      heading: 'Cormorant Garamond, serif',
      body: 'Source Serif 4, serif',
      accent: 'Great Vibes, cursive',
    },
    ornamentPreset: 'CORNERS',
    backgroundSetId: 'christmas-ambient',
  },
  MIDNIGHT: {
    id: 'MIDNIGHT',
    colors: {
      background: '#0d1b2a',
      surface: '#f0f4f8',
      surfaceAlt: '#e2e8f0',
      text: '#0d1b2a',
      muted: '#4a5568',
      gold: '#d4af37',
      success: '#2d6a4f',
      danger: '#c53030',
    },
    radii: { sm: 4, md: 8, lg: 16 },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    typography: {
      heading: 'Cormorant Garamond, serif',
      body: 'Source Serif 4, serif',
      accent: 'Dancing Script, cursive',
    },
    ornamentPreset: 'STARS',
    backgroundSetId: 'christmas-ambient',
  },
};

export type AmbientVariant = 'LANDSCAPE' | 'SQUARE' | 'PORTRAIT';

export function resolveAmbientVariant(width: number, height: number): AmbientVariant {
  if (!width || !height) return 'SQUARE';
  const ratio = width / height;
  if (ratio >= 1.25) return 'LANDSCAPE';
  if (ratio <= 0.8) return 'PORTRAIT';
  return 'SQUARE';
}

export const christmasAmbientPaths = {
  LANDSCAPE: '/assets/backgrounds/christmas-ambient-landscape.webp',
  SQUARE: '/assets/backgrounds/christmas-ambient-square.webp',
  PORTRAIT: '/assets/backgrounds/christmas-ambient-portrait.webp',
} as const;

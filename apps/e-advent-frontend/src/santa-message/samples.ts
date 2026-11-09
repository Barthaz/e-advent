import type { PlaybackView } from './api';

/** Example deliveries for a named child, shipped as static files and played through the real player. */
export const SAMPLE_MESSAGES: Record<string, PlaybackView> = {
  feliks: {
    childName: 'Feliks',
    childVocative: 'Feliksie',
    durationSeconds: 173,
    audioUrl: '/assets/santa-mail/samples/feliks.mp3',
    downloadUrl: '/assets/santa-mail/samples/feliks.mp3',
    transcript: '',
    availableUntil: null,
  },
};

export const DEFAULT_SAMPLE = 'feliks';

export function samplePath(slug = DEFAULT_SAMPLE): string {
  return `/od-mikolaja/przyklad/${slug}`;
}

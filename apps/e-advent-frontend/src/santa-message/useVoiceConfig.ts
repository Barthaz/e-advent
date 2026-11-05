import { useEffect, useState } from 'react';
import { fetchVoiceConfig, type VoiceConfig } from './api';

let cached: VoiceConfig | null = null;
let pending: Promise<VoiceConfig | null> | null = null;

function load(): Promise<VoiceConfig | null> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetchVoiceConfig()
      .then((config) => {
        cached = config;
        return config;
      })
      .catch(() => null)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/**
 * Sales flags come from the API, so the feature stays hidden until the backend
 * explicitly enables it (and on any network error).
 */
export function useVoiceConfig(): { config: VoiceConfig | null; loading: boolean } {
  const [config, setConfig] = useState<VoiceConfig | null>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    void load().then((result) => {
      if (!alive) return;
      setConfig(result);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { config, loading };
}

export function resetVoiceConfigCache(): void {
  cached = null;
  pending = null;
}

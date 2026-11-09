'use strict';

const { santaConfig } = require('./config');

/**
 * ElevenLabs text-to-speech. Only called after payment and personalization.
 * @param {string} text
 * @returns {Promise<Buffer>}
 */
async function synthesize(text) {
  const { elevenlabs } = santaConfig();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(elevenlabs.voiceId)}?output_format=${encodeURIComponent(elevenlabs.outputFormat)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': elevenlabs.apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: elevenlabs.modelId,
      voice_settings: { stability: elevenlabs.stability, similarity_boost: elevenlabs.similarityBoost },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const error = new Error(`TTS provider responded ${response.status}`);
    error.code = response.status === 429 ? 'TTS_RATE_LIMITED' : response.status >= 500 ? 'TTS_PROVIDER_DOWN' : 'TTS_REJECTED';
    error.retryable = response.status === 429 || response.status >= 500;
    throw error;
  }
  return Buffer.from(await response.arrayBuffer());
}

module.exports = { synthesize };

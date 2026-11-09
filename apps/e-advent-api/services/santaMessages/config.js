'use strict';

const { getProduct, VOICE_MESSAGE_SKU, VOICE_MESSAGE_ADDON_SKU } = require('../../config/products');

function flag(name, fallback = false) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  return raw === 'true' || raw === '1';
}

function int(name, fallback) {
  const n = parseInt(process.env[name] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Read at call time so flags can be flipped without a code change (and in tests). */
function santaConfig() {
  return {
    fulfillmentEnabled: flag('SANTA_FULFILLMENT_ENABLED', true),
    adminReviewRequired: flag('SANTA_ADMIN_REVIEW_REQUIRED', true),
    ttsAutomationEnabled: flag('SANTA_TTS_AUTOMATION_ENABLED'),
    devMailOutbox: flag('SANTA_DEV_MAIL_OUTBOX') && process.env.NODE_ENV !== 'production',
    maxAudioSeconds: int('SANTA_MAX_AUDIO_SECONDS', 120),
    draftTtlDays: int('SANTA_DRAFT_TTL_DAYS', 30),
    audioRetentionDays: int('SANTA_AUDIO_RETENTION_DAYS', 365),
    signedUrlTtlSeconds: int('SANTA_SIGNED_URL_TTL_SECONDS', 900),
    maxSubmits: int('SANTA_MAX_PERSONALIZATION_SUBMITS', 3),
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      voiceId: process.env.SANTA_VOICE_ID || '',
      modelId: process.env.SANTA_MODEL_ID || '',
      outputFormat: process.env.SANTA_TTS_OUTPUT_FORMAT || 'mp3_44100_128',
      voiceConfigVersion: process.env.SANTA_VOICE_CONFIG_VERSION || '1',
      stability: Number(process.env.SANTA_VOICE_STABILITY || 0.6),
      similarityBoost: Number(process.env.SANTA_VOICE_SIMILARITY || 0.8),
    },
  };
}

function ttsConfigured(config = santaConfig()) {
  const { apiKey, voiceId, modelId } = config.elevenlabs;
  return Boolean(config.ttsAutomationEnabled && apiKey && voiceId && modelId);
}

function publicConfig() {
  return {
    maxAudioSeconds: santaConfig().maxAudioSeconds,
    prices: {
      standalone: getProduct(VOICE_MESSAGE_SKU).basePrice,
      letterAddon: getProduct(VOICE_MESSAGE_ADDON_SKU).basePrice,
    },
  };
}

module.exports = { santaConfig, ttsConfigured, publicConfig };

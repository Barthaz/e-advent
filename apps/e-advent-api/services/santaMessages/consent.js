'use strict';
const { SANTA_CONSENT_VERSION, SANTA_DIGITAL_CONSENT, isVoiceMessageSku } = require('@e-advent/products');

function voiceConsentForCheckout(items, acceptanceData, committing) {
  if (!committing || !items.some((item) => isVoiceMessageSku(item.sku))) return null;
  if (acceptanceData?.digitalContentConsent !== true) {
    throw Object.assign(new Error('Zaznacz zgodę na dostarczenie wiadomości głosowej przed upływem terminu odstąpienia.'), { status: 400, code: 'DIGITAL_CONSENT_REQUIRED' });
  }
  return { version: SANTA_CONSENT_VERSION, text: SANTA_DIGITAL_CONSENT, acceptedAt: new Date().toISOString() };
}

module.exports = { voiceConsentForCheckout };

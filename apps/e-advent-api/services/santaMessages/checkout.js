'use strict';

const { loadDraftRow } = require('./drafts');

const MAX_VOICE_MESSAGES_PER_ORDER = 10;

function fieldError(msg, path) {
  return { type: 'field', msg, path, location: 'body' };
}

/**
 * Validates one cart line with a voice-message SKU. The draft key proves the
 * buyer created the draft; only the draft id is stored on the order line.
 * @returns {Promise<{ item?: object, error?: object }>}
 */
async function resolveVoiceLine(product, raw, quantity, index) {
  const draftId = raw.metadata?.voiceDraftId ? String(raw.metadata.voiceDraftId) : null;
  if (draftId) {
    if (quantity !== 1) {
      return { error: fieldError('Spersonalizowana wiadomość musi być osobną pozycją (ilość 1).', `items[${index}].quantity`) };
    }
    const draft = await loadDraftRow(draftId, raw.metadata?.voiceDraftKey);
    if (!draft) {
      return { error: fieldError('Personalizacja wiadomości wygasła. Otwórz kreator i zapisz ją ponownie.', `items[${index}].metadata`) };
    }
    if (draft.status !== 'draft') {
      return { error: fieldError('Ta wiadomość została już zamówiona. Utwórz nową w kreatorze.', `items[${index}].metadata`) };
    }
  }
  return {
    item: {
      sku: product.sku,
      productType: product.type,
      quantity,
      unitPrice: product.basePrice,
      calendarId: null,
      calendar: null,
      requiresShipping: false,
      metadata: { voiceMode: product.voiceMode, ...(draftId ? { voiceDraftId: draftId } : {}) },
    },
  };
}

/** Order-level rules: add-ons need letters, drafts are unique, total is bounded. */
function checkVoiceRules(resolved, letterCount, addonSku) {
  const voice = resolved.filter((r) => r.metadata?.voiceMode);
  if (!voice.length) return null;
  const total = voice.reduce((sum, r) => sum + r.quantity, 0);
  if (total > MAX_VOICE_MESSAGES_PER_ORDER) {
    return fieldError(`Jedno zamówienie może zawierać maksymalnie ${MAX_VOICE_MESSAGES_PER_ORDER} wiadomości od Mikołaja.`, 'items');
  }
  const addons = voice.filter((r) => r.sku === addonSku).reduce((sum, r) => sum + r.quantity, 0);
  if (addons > letterCount) {
    return fieldError('Wiadomość w cenie dodatku można zamówić tylko razem z Listem do Świętego Mikołaja (jedna na każdy list).', 'items');
  }
  const ids = voice.map((r) => r.metadata.voiceDraftId).filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    return fieldError('Ta sama personalizacja wiadomości występuje w koszyku dwa razy.', 'items');
  }
  return null;
}

module.exports = { resolveVoiceLine, checkVoiceRules, MAX_VOICE_MESSAGES_PER_ORDER };

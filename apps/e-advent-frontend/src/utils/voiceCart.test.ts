import { describe, expect, it } from 'vitest';
import {
  appendSantaLetterBundle,
  appendVoiceMessage,
  cartItemToCheckoutItem,
  convertVoiceToAddon,
  normalizeVoiceItems,
  setLetterPackQuantity,
  VOICE_MESSAGE_ADDON_SKU,
  VOICE_MESSAGE_SKU,
  voiceAddonSlots,
  type CartItem,
} from './cartStorage';
import { computeOrderTotals } from '../config/products';
import { isPrivatePagePath, sanitizePagePath } from './analytics';

function withLetters(quantity: number): CartItem[] {
  return appendSantaLetterBundle([], { letterQuantity: quantity }).items;
}

describe('voice message cart rules', () => {
  it('uses the add-on price only when a letter is in the cart', () => {
    const alone = appendVoiceMessage([], { mode: 'letter_addon' });
    expect(alone.added.sku).toBe(VOICE_MESSAGE_SKU);

    const withLetter = appendVoiceMessage(withLetters(1), { mode: 'letter_addon' });
    expect(withLetter.added.sku).toBe(VOICE_MESSAGE_ADDON_SKU);
    expect(withLetter.added.quantity).toBe(1);
  });

  it('caps add-ons at the number of letters', () => {
    let items = withLetters(1);
    items = appendVoiceMessage(items, { mode: 'letter_addon' }).items;
    const second = appendVoiceMessage(items, { mode: 'letter_addon' });
    expect(second.added.sku).toBe(VOICE_MESSAGE_SKU);
    expect(voiceAddonSlots(second.items)).toBe(0);
  });

  it('converts orphaned add-ons to standalone instead of removing them', () => {
    let items = withLetters(2);
    items = appendVoiceMessage(items, { mode: 'letter_addon' }).items;
    items = appendVoiceMessage(items, { mode: 'letter_addon' }).items;
    const next = setLetterPackQuantity(items, 1);
    expect(next.filter((i) => i.sku === VOICE_MESSAGE_ADDON_SKU)).toHaveLength(1);
    expect(next.filter((i) => i.sku === VOICE_MESSAGE_SKU)).toHaveLength(1);

    const withoutLetters = items.filter((i) => i.sku !== 'santa-letter');
    const { items: orphaned, converted } = normalizeVoiceItems(withoutLetters);
    expect(converted).toBe(2);
    expect(orphaned.every((i) => i.sku === VOICE_MESSAGE_SKU)).toBe(true);
  });

  it('reuses the cart line for the same draft', () => {
    const first = appendVoiceMessage([], { mode: 'standalone', voiceDraftId: 'd1', voiceDraftKey: 'k1' });
    const again = appendVoiceMessage(first.items, { mode: 'standalone', voiceDraftId: 'd1', voiceDraftKey: 'k2' });
    expect(again.items).toHaveLength(1);
    expect(again.added.voiceDraftKey).toBe('k2');
  });

  it('converts standalone to add-on when a letter slot is free', () => {
    const base = appendVoiceMessage([], { mode: 'standalone' });
    const items = [...withLetters(1), ...base.items];
    const converted = convertVoiceToAddon(items, base.added.id);
    expect(converted.find((i) => i.id === base.added.id)?.sku).toBe(VOICE_MESSAGE_ADDON_SKU);
  });

  it('sends draft reference in checkout metadata', () => {
    const { added } = appendVoiceMessage([], { mode: 'standalone', voiceDraftId: 'd1', voiceDraftKey: 'k1' });
    const line = cartItemToCheckoutItem(added);
    expect(line).toMatchObject({ sku: VOICE_MESSAGE_SKU, quantity: 1, metadata: { voiceDraftId: 'd1', voiceDraftKey: 'k1' } });
  });

  it('voice lines need no shipping and do not count toward free shipping', () => {
    const voiceOnly = computeOrderTotals([{ sku: VOICE_MESSAGE_SKU, quantity: 1 }], { shippingAmount: 0 });
    expect(voiceOnly?.hasPhysical).toBe(false);
    expect(voiceOnly?.total).toBeCloseTo(24);

    const bundle = computeOrderTotals(
      [{ sku: 'santa-letter', quantity: 1 }, { sku: VOICE_MESSAGE_ADDON_SKU, quantity: 1 }],
      { shippingAmount: 0 },
    );
    expect(bundle?.subtotal).toBeCloseTo(48);
    expect(bundle?.hasPhysical).toBe(true);
  });
});

describe('analytics path sanitizing', () => {
  it('hides private tokens', () => {
    expect(sanitizePagePath('/od-mikolaja/abcDEF123_-xyz')).toBe('/od-mikolaja/[private]');
    expect(sanitizePagePath('/wiadomosc-od-mikolaja/personalizacja/tok?x=1')).toBe('/wiadomosc-od-mikolaja/personalizacja/[private]');
    expect(isPrivatePagePath('/od-mikolaja/abc')).toBe(true);
  });

  it('keeps public paths and the demo intact', () => {
    expect(sanitizePagePath('/od-mikolaja/przyklad')).toBe('/od-mikolaja/przyklad');
    expect(sanitizePagePath('/wiadomosc-od-mikolaja')).toBe('/wiadomosc-od-mikolaja');
    expect(isPrivatePagePath('/koszyk')).toBe(false);
  });
});

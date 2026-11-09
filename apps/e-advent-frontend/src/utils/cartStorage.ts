import { DEFAULT_VAT_RATE } from '@e-advent/products';
import { computeOrderTotals, getOrderItemDisplayName, getProduct, type OrderTotals } from '../config/products';

export const CART_STORAGE_KEY = 'e-advent-cart';
export const CART_CHANGED_EVENT = 'e-advent-cart-changed';
export const SANTA_CERTIFICATE_SKU = 'santa-certificate';
export const SANTA_LETTER_SKU = 'santa-letter';

export interface CartItem {
  id: string;
  sku: string;
  quantity: number;
  calendarId?: string;
  label?: string;
  unitPrice?: number;
  /** Prefill checkout email / name for personalized calendars */
  customerEmail?: string;
  customerName?: string;
  format?: string;
  /** Imię dziecka na certyfikacie grzecznego dziecka */
  childName?: string;
  /** Certyfikat powiązany z konkretną pozycją listu w koszyku */
  linkedLetterId?: string;
  /** Wersja robocza z kreatora wiadomości od Mikołaja (klucz dowodzi autorstwa przy checkout) */
  voiceDraftId?: string;
  voiceDraftKey?: string;
}

export const VOICE_MESSAGE_SKU = 'voice-message';
export const VOICE_MESSAGE_ADDON_SKU = 'voice-message-addon';

export function isVoiceSku(sku: string): boolean {
  return sku === VOICE_MESSAGE_SKU || sku === VOICE_MESSAGE_ADDON_SKU;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is CartItem => {
        if (!item || typeof item !== 'object') return false;
        const row = item as CartItem;
        return typeof row.sku === 'string' && typeof row.id === 'string';
      })
      .map((item) => ({
        ...item,
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      }));
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function clearCartStorage(): void {
  localStorage.removeItem(CART_STORAGE_KEY);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + Math.max(1, item.quantity || 1), 0);
}

export function getCartTotals(items: CartItem[]): OrderTotals | null {
  if (items.length === 0) {
    return {
      subtotal: 0,
      shipping: 0,
      total: 0,
      hasPhysical: false,
      freeShipping: false,
      vatRate: DEFAULT_VAT_RATE,
      subtotalNetto: 0, subtotalVat: 0, shippingNetto: 0, shippingVat: 0, amountNetto: 0, vatAmount: 0, lines: [],
    };
  }
  return computeOrderTotals(items.map((item) => ({ sku: item.sku, quantity: item.quantity })));
}

export function createCartItem(
  input: Omit<CartItem, 'id' | 'quantity'> & { quantity?: number },
): CartItem {
  return {
    id: createId(),
    sku: input.sku,
    quantity: Math.max(1, Math.floor(input.quantity ?? 1)),
    ...(input.calendarId ? { calendarId: input.calendarId } : {}),
    ...(input.label ? { label: input.label } : {}),
    ...(input.unitPrice != null ? { unitPrice: input.unitPrice } : {}),
    ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
    ...(input.customerName ? { customerName: input.customerName } : {}),
    ...(input.format ? { format: input.format } : {}),
    ...(input.childName ? { childName: input.childName } : {}),
    ...(input.linkedLetterId ? { linkedLetterId: input.linkedLetterId } : {}),
    ...(input.voiceDraftId ? { voiceDraftId: input.voiceDraftId } : {}),
    ...(input.voiceDraftKey ? { voiceDraftKey: input.voiceDraftKey } : {}),
  };
}

export function hasLinkedCertificate(items: CartItem[], letterId: string): boolean {
  return items.some(
    (item) => item.sku === SANTA_CERTIFICATE_SKU && item.linkedLetterId === letterId,
  );
}

/** Usuwa certyfikaty-sieroty i pozycje bez powiązanego listu; nadmiarowe dodatki audio stają się samodzielne. */
export function sanitizeCartItems(items: CartItem[]): CartItem[] {
  const ids = new Set(items.map((item) => item.id));
  const kept = items.filter((item) => {
    if (item.sku !== SANTA_CERTIFICATE_SKU) return true;
    return Boolean(item.linkedLetterId && ids.has(item.linkedLetterId));
  });
  return normalizeVoiceItems(kept).items;
}

/* ---------- Wiadomość od Świętego Mikołaja ---------- */

function voiceLabel(sku: string): string {
  return getProduct(sku)?.name ?? 'Wiadomość od Świętego Mikołaja';
}

function asVoiceSku(item: CartItem, sku: string): CartItem {
  return { ...item, sku, quantity: 1, label: voiceLabel(sku), unitPrice: getProduct(sku)?.basePrice };
}

export function voiceAddonCount(items: CartItem[]): number {
  return items.filter((item) => item.sku === VOICE_MESSAGE_ADDON_SKU).reduce((sum, item) => sum + item.quantity, 0);
}

export function voiceItems(items: CartItem[]): CartItem[] {
  return items.filter((item) => isVoiceSku(item.sku));
}

/** Wolne „miejsca” na cenę dodatku: jeden dodatek na każdy list w koszyku. */
export function voiceAddonSlots(items: CartItem[]): number {
  return Math.max(0, letterPackQuantity(items) - voiceAddonCount(items));
}

/**
 * Dodatek bez listu przechodzi na cenę samodzielną zamiast znikać z koszyka.
 * Każda wiadomość to osobna linia z ilością 1 (jedna personalizacja = jedno nagranie).
 */
export function normalizeVoiceItems(items: CartItem[]): { items: CartItem[]; converted: number } {
  let allowed = letterPackQuantity(items);
  let converted = 0;
  const next = items.map((item) => {
    if (!isVoiceSku(item.sku)) return item;
    const single = item.quantity === 1 ? item : { ...item, quantity: 1 };
    if (item.sku !== VOICE_MESSAGE_ADDON_SKU) return single;
    if (allowed > 0) {
      allowed -= 1;
      return single;
    }
    converted += 1;
    return asVoiceSku(single, VOICE_MESSAGE_SKU);
  });
  return { items: next, converted };
}

export function appendVoiceMessage(
  items: CartItem[],
  input: { mode: 'standalone' | 'letter_addon'; voiceDraftId?: string; voiceDraftKey?: string },
): { items: CartItem[]; added: CartItem } {
  const existing = input.voiceDraftId ? items.find((item) => item.voiceDraftId === input.voiceDraftId) : undefined;
  const sku = input.mode === 'letter_addon' && voiceAddonSlots(items) > 0 ? VOICE_MESSAGE_ADDON_SKU : VOICE_MESSAGE_SKU;
  if (existing) {
    const updated = { ...existing, voiceDraftKey: input.voiceDraftKey ?? existing.voiceDraftKey };
    return { items: items.map((item) => (item.id === existing.id ? updated : item)), added: updated };
  }
  const added = createCartItem({
    sku,
    quantity: 1,
    label: voiceLabel(sku),
    unitPrice: getProduct(sku)?.basePrice,
    voiceDraftId: input.voiceDraftId,
    voiceDraftKey: input.voiceDraftKey,
  });
  return { items: [...items, added], added };
}

/** Samodzielna wiadomość → cena dodatku, gdy w koszyku jest wolny list (po potwierdzeniu klienta). */
export function convertVoiceToAddon(items: CartItem[], id: string): CartItem[] {
  if (voiceAddonSlots(items) < 1) return items;
  return items.map((item) => (item.id === id && item.sku === VOICE_MESSAGE_SKU ? asVoiceSku(item, VOICE_MESSAGE_ADDON_SKU) : item));
}

function collectCertificateNames(input: {
  childName?: string;
  childNames?: string[];
}): string[] {
  const fromList = Array.isArray(input.childNames) ? input.childNames : [];
  const raw = fromList.length > 0 ? fromList : input.childName ? [input.childName] : [];
  return raw
    .map((name) => String(name ?? '').replace(/\s+/g, ' ').trim())
    .filter((name) => name.length >= 2);
}

function addLinkedLetterAndCertificate(
  items: CartItem[],
  childName: string,
  letterLabel?: string,
): { items: CartItem[]; added: CartItem[] } {
  const letterProduct = getProduct(SANTA_LETTER_SKU);
  const certificateProduct = getProduct(SANTA_CERTIFICATE_SKU);
  const letter = createCartItem({
    sku: SANTA_LETTER_SKU,
    quantity: 1,
    label: letterLabel ?? letterProduct?.name,
    unitPrice: letterProduct?.basePrice,
  });
  const certificate = createCartItem({
    sku: SANTA_CERTIFICATE_SKU,
    quantity: 1,
    childName,
    linkedLetterId: letter.id,
    label: `CERTYFIKAT - ${childName}`,
    unitPrice: certificateProduct?.basePrice,
  });
  return { items: [...items, letter, certificate], added: [letter, certificate] };
}

function addPlainLetters(
  items: CartItem[],
  quantity: number,
  letterLabel?: string,
): { items: CartItem[]; added: CartItem[] } {
  const letterProduct = getProduct(SANTA_LETTER_SKU);
  const qty = Math.max(1, Math.floor(quantity));
  const mergeTarget = items.find(
    (item) => item.sku === SANTA_LETTER_SKU && !hasLinkedCertificate(items, item.id),
  );

  if (mergeTarget) {
    const updated: CartItem = {
      ...mergeTarget,
      quantity: mergeTarget.quantity + qty,
      label: letterLabel ?? mergeTarget.label ?? letterProduct?.name,
    };
    return {
      items: items.map((item) => (item.id === mergeTarget.id ? updated : item)),
      added: [updated],
    };
  }

  const letter = createCartItem({
    sku: SANTA_LETTER_SKU,
    quantity: qty,
    label: letterLabel ?? letterProduct?.name,
    unitPrice: letterProduct?.basePrice,
  });
  return { items: [...items, letter], added: [letter] };
}

/** Add a certificate to a letter already in the cart, without buying another letter. */
export function appendCertificateToLetter(items: CartItem[], name: string): { items: CartItem[]; added: CartItem[] } {
  const childName = name.replace(/\s+/g, ' ').trim();
  const letter = items.find((item) => item.sku === SANTA_LETTER_SKU && !hasLinkedCertificate(items, item.id));
  if (!letter || childName.length < 2 || childName.length > 60) return { items, added: [] };
  const remaining = items.flatMap((item) => item.id !== letter.id ? [item] : item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : []);
  const result = addLinkedLetterAndCertificate(remaining, childName, letter.label);
  return { items: result.items, added: result.added.filter((item) => item.sku === SANTA_CERTIFICATE_SKU) };
}

export function appendSantaLetterBundle(
  items: CartItem[],
  input: { childName?: string; childNames?: string[]; letterQuantity?: number; letterLabel?: string },
): { items: CartItem[]; added: CartItem[] } {
  const letterQuantity = Math.min(99, Math.max(1, Math.floor(Number(input.letterQuantity) || 1)));
  const names = collectCertificateNames(input).slice(0, letterQuantity);

  let current = items;
  const added: CartItem[] = [];

  for (const childName of names) {
    const result = addLinkedLetterAndCertificate(current, childName, input.letterLabel);
    current = result.items;
    added.push(...result.added);
  }

  const remaining = letterQuantity - names.length;
  if (remaining > 0) {
    const result = addPlainLetters(current, remaining, input.letterLabel);
    current = result.items;
    added.push(...result.added);
  }

  return { items: current, added };
}

function mergeUnlinkedLetters(items: CartItem[]): CartItem[] {
  const unlinked = items.filter(
    (item) => item.sku === SANTA_LETTER_SKU && !hasLinkedCertificate(items, item.id),
  );
  if (unlinked.length <= 1) return items;
  const [first, ...rest] = unlinked;
  const merged: CartItem = {
    ...first,
    quantity: unlinked.reduce((sum, item) => sum + item.quantity, 0),
  };
  const restIds = new Set(rest.map((item) => item.id));
  return items
    .filter((item) => !restIds.has(item.id))
    .map((item) => (item.id === first.id ? merged : item));
}

export function letterPackQuantity(items: CartItem[]): number {
  return items
    .filter((item) => item.sku === SANTA_LETTER_SKU)
    .reduce((sum, item) => sum + item.quantity, 0);
}

export function letterPackCertificates(items: CartItem[]): CartItem[] {
  return sanitizeCartItems(items).filter((item) => item.sku === SANTA_CERTIFICATE_SKU);
}

export function removeCertificate(items: CartItem[], certificateId: string): CartItem[] {
  const target = items.find((item) => item.id === certificateId);
  if (!target || target.sku !== SANTA_CERTIFICATE_SKU) return items;
  return mergeUnlinkedLetters(sanitizeCartItems(items.filter((item) => item.id !== certificateId)));
}

function decreaseLetters(items: CartItem[], count: number): CartItem[] {
  let remaining = Math.max(0, Math.floor(count));
  if (remaining === 0) return items;
  const next = [...items];
  for (let index = next.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const item = next[index];
    if (item.sku !== SANTA_LETTER_SKU) continue;
    if (item.quantity > remaining) {
      next[index] = { ...item, quantity: item.quantity - remaining };
      remaining = 0;
      break;
    }
    remaining -= item.quantity;
    next.splice(index, 1);
  }
  return mergeUnlinkedLetters(sanitizeCartItems(next));
}

export function removeOneLetter(items: CartItem[]): CartItem[] {
  if (letterPackQuantity(items) < 1) return items;
  const certificates = letterPackCertificates(items);
  const lastCertificate = certificates[certificates.length - 1];
  const withoutCert = lastCertificate ? removeCertificate(items, lastCertificate.id) : items;
  return decreaseLetters(withoutCert, 1);
}

export function removeLetterPack(items: CartItem[]): CartItem[] {
  return normalizeVoiceItems(items.filter(
    (item) => item.sku !== SANTA_LETTER_SKU && item.sku !== SANTA_CERTIFICATE_SKU,
  )).items;
}

export function certificatesRemovedByLetterDrop(items: CartItem[], nextQuantity: number): CartItem[] {
  const current = letterPackQuantity(items);
  const drop = Math.max(0, current - Math.max(0, Math.floor(nextQuantity)));
  if (drop === 0) return [];
  return letterPackCertificates(items).slice(-drop);
}

export function setLetterPackQuantity(items: CartItem[], nextQuantity: number): CartItem[] {
  const qty = Math.max(0, Math.min(99, Math.floor(nextQuantity)));
  const current = letterPackQuantity(items);
  if (qty === current) return items;
  if (qty < 1) return removeLetterPack(items);
  if (qty > current) return addPlainLetters(items, qty - current).items;

  let next = items;
  for (let i = 0; i < current - qty; i += 1) {
    next = removeOneLetter(next);
  }
  return next;
}

export function removeCartItem(items: CartItem[], id: string): CartItem[] {
  const target = items.find((item) => item.id === id);
  if (!target) return items;
  if (target.sku === SANTA_CERTIFICATE_SKU) return removeCertificate(items, id);
  if (target.sku === SANTA_LETTER_SKU) return removeLetterPack(items);
  return sanitizeCartItems(
    items.filter((item) => item.id !== id && item.linkedLetterId !== id),
  );
}

export type CartDisplayRow =
  | {
      kind: 'item';
      item: CartItem;
      removable: boolean;
      lockQuantity: boolean;
    }
  | {
      kind: 'letter-group';
      quantity: number;
      unitPrice: number;
      label: string;
      certificates: CartItem[];
    };

export function buildCartDisplayRows(items: CartItem[]): CartDisplayRow[] {
  const sanitized = sanitizeCartItems(items);
  const letters = sanitized.filter((item) => item.sku === SANTA_LETTER_SKU);
  const certificates = sanitized.filter((item) => item.sku === SANTA_CERTIFICATE_SKU);
  const mains = sanitized.filter(
    (item) => item.sku !== SANTA_CERTIFICATE_SKU && item.sku !== SANTA_LETTER_SKU,
  );
  const rows: CartDisplayRow[] = [];

  if (letters.length > 0) {
    const quantity = letters.reduce((sum, item) => sum + item.quantity, 0);
    const sample = letters[0];
    rows.push({
      kind: 'letter-group',
      quantity,
      unitPrice: sample.unitPrice ?? getProduct(SANTA_LETTER_SKU)?.basePrice ?? 0,
      label: sample.label ?? getProduct(SANTA_LETTER_SKU)?.name ?? 'List do Świętego Mikołaja',
      certificates,
    });
  }

  for (const item of mains) {
    rows.push({
      kind: 'item',
      item,
      removable: true,
      lockQuantity: Boolean(item.calendarId) || isVoiceSku(item.sku),
    });
  }

  return rows;
}

export function cartItemCheckoutKey(item: CartItem): string {
  const child = item.childName ? `:child:${item.childName}` : '';
  const link = item.linkedLetterId ? `:link:${item.linkedLetterId}` : '';
  const draft = item.voiceDraftId ? `:voice:${item.voiceDraftId}` : '';
  return `${item.sku}:${item.quantity}:${item.calendarId || ''}${child}${link}${draft}`;
}

export function cartItemToCheckoutItem(item: CartItem): {
  sku: string;
  quantity: number;
  calendarId?: string;
  metadata?: { childName?: string; voiceDraftId?: string; voiceDraftKey?: string };
} {
  const voiceDraft = item.voiceDraftId && item.voiceDraftKey
    ? { voiceDraftId: item.voiceDraftId, voiceDraftKey: item.voiceDraftKey }
    : null;
  return {
    sku: item.sku,
    quantity: item.quantity,
    ...(item.calendarId ? { calendarId: item.calendarId } : {}),
    ...(item.childName ? { metadata: { childName: item.childName } } : {}),
    ...(voiceDraft ? { metadata: voiceDraft } : {}),
  };
}

export function checkoutItemsFromCart(items: CartItem[]): Array<ReturnType<typeof cartItemToCheckoutItem>> {
  const sanitized = sanitizeCartItems(items);
  const letters = sanitized.filter((item) => item.sku === SANTA_LETTER_SKU);
  const others = sanitized.filter((item) => item.sku !== SANTA_LETTER_SKU);
  const letterQty = letters.reduce((sum, item) => sum + item.quantity, 0);
  const rows = others.map(cartItemToCheckoutItem);
  if (letterQty > 0) {
    rows.unshift({ sku: SANTA_LETTER_SKU, quantity: letterQty });
  }
  return rows;
}

export function getCartItemDisplayName(item: CartItem): string {
  if (item.label) return item.label;
  return getOrderItemDisplayName(
    item.sku,
    item.childName ? { childName: item.childName } : undefined,
  );
}

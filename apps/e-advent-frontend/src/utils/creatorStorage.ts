import type { CalendarFormat, CreatorFormData, DesignSelection, ProductType, ShippingAddress } from '../types/order';
import type { CalendarTaskInput } from '../types/order';
import { getProduct, getSkuForTypeAndFormat } from '../config/products';

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export const PENDING_CALENDAR_ID_KEY = 'e-advent-pending-calendar-id';
export const PENDING_EDIT_TOKEN_KEY = 'e-advent-pending-edit-token';
export const PURCHASED_CALENDAR_IDS_KEY = 'e-advent-purchased-calendar-ids';
const LEGACY_CALENDAR_ID_KEY = 'calendarId';

function prefix(productType: ProductType, key: string): string {
  return `e-advent-${productType}-${key}`;
}

export function getStorageKeys(productType: ProductType) {
  return {
    form: prefix(productType, 'creator-form'),
    tasks: prefix(productType, 'tasks'),
    selectedExamples: prefix(productType, 'selected-examples'),
    generatedCalendar: prefix(productType, 'generated-calendar'),
    design: prefix(productType, 'design'),
    format: prefix(productType, 'format'),
    shipping: prefix(productType, 'shipping'),
    calendarData: prefix(productType, 'calendar-data'),
    productType: 'e-advent-product-type',
    sku: 'e-advent-sku',
  };
}

export function getPendingCalendarSession(): { calendarId: string; editToken: string } | null {
  const calendarId = localStorage.getItem(PENDING_CALENDAR_ID_KEY);
  const editToken = localStorage.getItem(PENDING_EDIT_TOKEN_KEY);
  if (!calendarId || !editToken) return null;
  return { calendarId, editToken };
}

export function setPendingCalendarSession(calendarId: string, editToken: string) {
  localStorage.setItem(PENDING_CALENDAR_ID_KEY, calendarId);
  localStorage.setItem(PENDING_EDIT_TOKEN_KEY, editToken);
  localStorage.setItem(LEGACY_CALENDAR_ID_KEY, calendarId);
}

export function clearPendingCalendarSession() {
  localStorage.removeItem(PENDING_CALENDAR_ID_KEY);
  localStorage.removeItem(PENDING_EDIT_TOKEN_KEY);
  localStorage.removeItem(LEGACY_CALENDAR_ID_KEY);
}

export function getPurchasedCalendarIds(): string[] {
  try {
    const raw = localStorage.getItem(PURCHASED_CALENDAR_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function markCalendarPurchased(calendarId: string) {
  const ids = getPurchasedCalendarIds();
  if (!ids.includes(calendarId)) {
    ids.push(calendarId);
    localStorage.setItem(PURCHASED_CALENDAR_IDS_KEY, JSON.stringify(ids));
  }
  clearPendingCalendarSession();
}

/** Pending id for checkout updates — never reuse a purchased id. */
export function getReusablePendingCalendarId(): string | null {
  const pending = getPendingCalendarSession();
  if (!pending) return null;
  if (getPurchasedCalendarIds().includes(pending.calendarId)) {
    clearPendingCalendarSession();
    return null;
  }
  return pending.calendarId;
}

export function accessCodeStorageKey(calendarId: string) {
  return `e-advent-access-code-${calendarId}`;
}

export function saveAccessCodeForCalendar(calendarId: string, accessCode: string) {
  sessionStorage.setItem(accessCodeStorageKey(calendarId), accessCode);
}

export function loadAccessCodeForCalendar(calendarId: string): string | null {
  return sessionStorage.getItem(accessCodeStorageKey(calendarId));
}

export function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

export function hasCookieConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('cookieConsent') === 'accepted';
}

export function saveFormData(productType: ProductType, data: CreatorFormData) {
  const keys = getStorageKeys(productType);
  const json = JSON.stringify(data);
  localStorage.setItem(keys.form, json);
  if (hasCookieConsent()) {
    setCookie(keys.form, json, COOKIE_MAX_AGE);
  }
}

export function loadFormData(productType: ProductType): Partial<CreatorFormData> {
  const keys = getStorageKeys(productType);
  let saved = localStorage.getItem(keys.form);
  if (!saved && hasCookieConsent()) {
    saved = getCookie(keys.form);
  }
  if (!saved) return {};
  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

export function saveTasks(productType: ProductType, tasks: CalendarTaskInput[]) {
  localStorage.setItem(getStorageKeys(productType).tasks, JSON.stringify(tasks));
}

export function loadTasks(productType: ProductType): CalendarTaskInput[] {
  const saved = localStorage.getItem(getStorageKeys(productType).tasks);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSelectedExamples(productType: ProductType, indices: number[]) {
  localStorage.setItem(getStorageKeys(productType).selectedExamples, JSON.stringify(indices));
}

export function loadSelectedExamples(productType: ProductType): number[] {
  const saved = localStorage.getItem(getStorageKeys(productType).selectedExamples);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGeneratedCalendar(
  productType: ProductType,
  calendar: Array<{ day: number; task: string; duration?: number; latestDay?: number }>
) {
  localStorage.setItem(getStorageKeys(productType).generatedCalendar, JSON.stringify(calendar));
}

export function loadGeneratedCalendar(productType: ProductType) {
  const saved = localStorage.getItem(getStorageKeys(productType).generatedCalendar);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function saveDesign(productType: ProductType, design: DesignSelection) {
  localStorage.setItem(getStorageKeys(productType).design, JSON.stringify(design));
}

export function loadDesign(productType: ProductType): DesignSelection | null {
  const saved = localStorage.getItem(getStorageKeys(productType).design);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function saveFormat(productType: ProductType, format: CalendarFormat) {
  localStorage.setItem(getStorageKeys(productType).format, format);
}

export function loadFormat(productType: ProductType): CalendarFormat | null {
  const saved = localStorage.getItem(getStorageKeys(productType).format);
  return saved === 'A4' || saved === 'A3' ? saved : null;
}

export function saveShipping(productType: ProductType, address: ShippingAddress) {
  localStorage.setItem(getStorageKeys(productType).shipping, JSON.stringify(address));
}

export function loadShipping(productType: ProductType): ShippingAddress | null {
  const saved = localStorage.getItem(getStorageKeys(productType).shipping);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function setActiveProduct(productType: ProductType, sku: string) {
  const keys = getStorageKeys(productType);
  localStorage.setItem(keys.productType, productType);
  localStorage.setItem(keys.sku, sku);
  const calendarData = localStorage.getItem(keys.calendarData);
  if (calendarData) {
    localStorage.setItem('calendarData', calendarData);
  }
}

export function getActiveProduct(): { productType: ProductType; sku: string } | null {
  const productType = localStorage.getItem('e-advent-product-type') as ProductType | null;
  const sku = localStorage.getItem('e-advent-sku');
  if (productType && sku) {
    return { productType, sku };
  }

  const legacyData = localStorage.getItem('calendarData');
  if (!legacyData) return null;

  try {
    const parsed = JSON.parse(legacyData) as { productType?: ProductType; sku?: string };
    if (parsed.productType && parsed.sku) {
      return { productType: parsed.productType, sku: parsed.sku };
    }
  } catch {
    return null;
  }

  return { productType: 'interactive', sku: 'interactive' };
}

export function loadCheckoutCalendarData(): string | null {
  const active = getActiveProduct();
  if (active) {
    const productData = localStorage.getItem(getStorageKeys(active.productType).calendarData);
    if (productData) return productData;
  }
  return localStorage.getItem('calendarData');
}

export function resolveCheckoutProduct(
  parsed: { productType?: ProductType; sku?: string; format?: string },
  active: { productType: ProductType; sku: string } | null
): { productType: ProductType; sku: string } {
  const productType = parsed.productType || active?.productType || 'interactive';
  let sku = parsed.sku || active?.sku || 'interactive';

  const product = getProduct(sku);
  if (!product || product.type !== productType) {
    if (productType === 'interactive') {
      sku = 'interactive';
    } else {
      const format: CalendarFormat = parsed.format === 'A3' ? 'A3' : 'A4';
      sku = getSkuForTypeAndFormat(productType, format) || sku;
    }
  }

  return { productType, sku };
}

export function clearCreatorData(productType: ProductType) {
  const keys = getStorageKeys(productType);
  Object.values(keys).forEach((key) => {
    if (key !== keys.productType && key !== keys.sku) {
      localStorage.removeItem(key);
    }
  });
  if (productType === 'interactive') {
    localStorage.removeItem('calendarData');
    localStorage.removeItem('e-advent-creator-form');
    localStorage.removeItem('e-advent-tasks');
    localStorage.removeItem('e-advent-selected-examples');
    localStorage.removeItem('e-advent-generated-calendar');
  }
}

export function generateDecemberDates(): string[] {
  const dates: string[] = [];
  const currentYear = new Date().getFullYear();
  for (let i = 1; i <= 24; i++) {
    dates.push(new Date(currentYear, 11, i).toISOString());
  }
  return dates;
}

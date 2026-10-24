import type { CalendarFormat, ProductType } from '@e-advent/types';

export interface ProductSkuConfig {
  /** Historical SKU, unavailable for new purchases. */
  discontinued?: boolean;
  sku: string;
  type: ProductType;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  shippingCost: number;
  format: CalendarFormat | null;
  requiresShipping: boolean;
  requiresDesign: boolean;
  creatorRoute: string;
  /** Dostępny wyłącznie jako dodatek do listu do Mikołaja */
  letterAddonOnly?: boolean;
}

export interface ProductFamilyBase {
  type: ProductType;
  slug: string;
  name: string;
  shortDescription: string;
  icon: string;
  creatorRoute: string;
  priceFrom: number;
  features: string[];
  requiresShipping: boolean;
  requiresDesign: boolean;
}

export interface OrderLineVat {
  sku: string;
  quantity: number;
  vatRate: number;
  /** Cena jednostkowa brutto (jak w katalogu / Stripe) */
  unitPrice: number;
  unitPriceNetto: number;
  lineBrutto: number;
  lineNetto: number;
  lineVat: number;
}

export interface OrderTotals {
  /** Suma produktów brutto */
  subtotal: number;
  /** Wysyłka brutto */
  shipping: number;
  /** Razem brutto (płatność Stripe) */
  total: number;
  hasPhysical: boolean;
  freeShipping: boolean;
  vatRate: number;
  subtotalNetto: number;
  subtotalVat: number;
  shippingNetto: number;
  shippingVat: number;
  amountNetto: number;
  vatAmount: number;
  lines: OrderLineVat[];
  discountPercent?: number;
  discount?: number;
}

export const SHIPPING_COST: number;
export const FREE_SHIPPING_THRESHOLD: number;
export const DEFAULT_VAT_RATE: number;
export const PRODUCTS: Record<string, ProductSkuConfig>;
export const PRODUCT_FAMILIES: ProductFamilyBase[];

export function roundPln(amount: number): number;
export function splitGrossAmount(
  grossBrutto: number,
  vatRate?: number,
): { brutto: number; netto: number; vat: number; vatRate: number };
export function getProduct(sku: string): ProductSkuConfig | null;
export function isPhysicalProduct(sku: string): boolean;
export function computeOrderTotals(
  items: Array<{ sku: string; quantity?: number }>,
  options?: { shippingAmount?: number; vatRate?: number },
): OrderTotals | null;
export function applyPercentDiscount(
  totals: OrderTotals,
  percent: number,
): OrderTotals | null;
export function getProductPrice(sku: string): number | null;
export function getSkuForTypeAndFormat(
  type: ProductType,
  format?: CalendarFormat | null,
): string | null;

export const SANTA_CERTIFICATE_SKU: string;
export const SANTA_LETTER_SKU: string;
export function isLetterAddonSku(sku: string): boolean;
export function getOrderItemDisplayName(
  sku: string,
  metadata?: { childName?: string } | null,
): string;

export const DISCOUNT_PERCENTS: number[];
export function isSupportedDiscountPercent(percent: number): boolean;
export function isCalendarProductType(type: string | null | undefined): boolean;
export function isCalendarSku(sku: string): boolean;
export const LETTER_PROMO_CODE: string;
export const LETTER_PROMO_PERCENT: number;
export const CALENDARS_ON_SALE_FROM: string;
export function isCalendarsOnSale(now?: Date | string | number): boolean;
export function isLetterPromoActive(now?: Date | string | number): boolean;

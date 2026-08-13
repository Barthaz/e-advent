import type { CalendarFormat, ProductType } from '@e-advent/types';

export interface ProductSkuConfig {
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

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  total: number;
  hasPhysical: boolean;
  freeShipping: boolean;
}

export const SHIPPING_COST: number;
export const FREE_SHIPPING_THRESHOLD: number;
export const PRODUCTS: Record<string, ProductSkuConfig>;
export const PRODUCT_FAMILIES: ProductFamilyBase[];

export function getProduct(sku: string): ProductSkuConfig | null;
export function isPhysicalProduct(sku: string): boolean;
export function computeOrderTotals(
  items: Array<{ sku: string; quantity?: number }>,
): OrderTotals | null;
export function getProductPrice(sku: string): number | null;
export function getSkuForTypeAndFormat(
  type: ProductType,
  format?: CalendarFormat | null,
): string | null;

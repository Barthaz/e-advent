import type { PaymentStatus, FulfillmentStatus, DeliveryType, ProductType } from '../types/order';
import {
  PAYMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_LABELS,
  DELIVERY_TYPE_LABELS,
  DELIVERY_TYPE_NONE_PENDING_LABEL,
  PRODUCT_TYPE_LABELS,
} from './constants';

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

export function formatDateShort(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoString));
}

/** Kwota z API jest już w jednostkach głównych (PLN), nie w groszach. */
export function formatAmount(amount: number | null | undefined, currency = 'PLN'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

export function formatAddress(
  street: string | null,
  city: string | null,
  postalCode: string | null,
): string {
  const parts = [street, postalCode && city ? `${postalCode} ${city}` : city].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function getFulfillmentStatusLabel(status: FulfillmentStatus): string {
  return FULFILLMENT_STATUS_LABELS[status] ?? status;
}

/** Fizyczny produkt z delivery_type=none = adres jeszcze nieuzupełniony, nie dostawa cyfrowa. */
export function getDeliveryTypeLabel(
  type: DeliveryType,
  productType?: ProductType | null,
): string {
  if (type === 'none' && (productType === 'scratch' || productType === 'letter')) {
    return DELIVERY_TYPE_NONE_PENDING_LABEL;
  }
  return DELIVERY_TYPE_LABELS[type] ?? type;
}

export function getDeliveryBadgeVariant(
  type: DeliveryType,
  productType?: ProductType | null,
): DeliveryType | 'pending_address' {
  if (type === 'none' && (productType === 'scratch' || productType === 'letter')) {
    return 'pending_address';
  }
  return type;
}

export function getProductTypeLabel(type: ProductType): string {
  return PRODUCT_TYPE_LABELS[type] ?? type;
}

export function truncate(text: string | null | undefined, max = 40): string {
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

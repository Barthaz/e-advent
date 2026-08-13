import type { PaymentStatus, FulfillmentStatus, DeliveryType, ProductType } from '../types/order';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Oczekuje',
  succeeded: 'Opłacone',
  failed: 'Nieudane',
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  pending: 'Nowe',
  processing: 'W realizacji',
  shipped: 'Wysłane',
  delivered: 'Dostarczone',
  cancelled: 'Anulowane',
  hold: 'Wstrzymane',
};

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  none: 'Brak (dostawa cyfrowa)',
  poczta_polska: 'Poczta Polska',
  courier_inpost: 'Kurier InPost',
  parcel_inpost: 'Paczkomat InPost',
};

/** Etykieta dla selecta „Brak” — kontekst zależny od typu produktu jest w getDeliveryTypeLabel. */
export const DELIVERY_TYPE_NONE_PENDING_LABEL = 'Adres nieuzupełniony';

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  interactive: 'Interaktywny',
  scratch: 'Zdrapkowy',
  letter: 'List do Mikołaja',
};

export const PAYMENT_STATUS_OPTIONS: Array<{ value: PaymentStatus | ''; label: string }> = [
  { value: '', label: 'Wszystkie statusy płatności' },
  { value: 'pending', label: 'Oczekuje' },
  { value: 'succeeded', label: 'Opłacone' },
  { value: 'failed', label: 'Nieudane' },
];

export const FULFILLMENT_STATUS_OPTIONS: Array<{ value: FulfillmentStatus | ''; label: string }> = [
  { value: '', label: 'Wszystkie statusy realizacji' },
  { value: 'pending', label: 'Nowe' },
  { value: 'processing', label: 'W realizacji' },
  { value: 'shipped', label: 'Wysłane' },
  { value: 'delivered', label: 'Dostarczone' },
  { value: 'cancelled', label: 'Anulowane' },
  { value: 'hold', label: 'Wstrzymane' },
];

export const DELIVERY_TYPE_OPTIONS: Array<{ value: DeliveryType | ''; label: string }> = [
  { value: '', label: 'Wszystkie dostawy' },
  { value: 'none', label: 'Brak' },
  { value: 'poczta_polska', label: 'Poczta Polska' },
  { value: 'courier_inpost', label: 'Kurier InPost' },
  { value: 'parcel_inpost', label: 'Paczkomat InPost' },
];

export const PRODUCT_TYPE_OPTIONS: Array<{ value: ProductType | ''; label: string }> = [
  { value: '', label: 'Wszystkie typy' },
  { value: 'interactive', label: 'Interaktywny' },
  { value: 'scratch', label: 'Zdrapkowy' },
  { value: 'letter', label: 'List do Mikołaja' },
];

export const DEFAULT_PAGE_LIMIT = 20;

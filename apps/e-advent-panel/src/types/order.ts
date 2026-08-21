export type {
  PaymentStatus,
  FulfillmentStatus,
  ProductType,
  DeliveryType,
} from '@e-advent/types';

import type { ProductType, PaymentStatus, FulfillmentStatus, DeliveryType } from '@e-advent/types';

export interface OrderItem {
  id: string;
  sku: string;
  productType: ProductType | string;
  quantity: number;
  unitPrice: number;
  calendarId?: string | null;
  metadata?: {
    childName?: string;
  };
  /** Etykieta do wyświetlenia (np. CERTYFIKAT - Imię) */
  displayName?: string;
}

export interface OrderListItem {
  id: string;
  /** Kolejny numer zamówienia (1, 2, …) */
  order_number: number | null;
  /** Numer dla klienta, np. 000001 */
  order_number_display: string | null;
  calendar_id: string | null;
  stripe_payment_intent_id: string | null;
  status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  product_type: ProductType;
  delivery_type: DeliveryType;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  /** Kwota w jednostkach głównych waluty (np. PLN), nie w groszach */
  amount: number;
  shipping_amount?: number;
  currency: string;
  tracking_number: string | null;
  shipping_city: string | null;
  created_at: string;
  updated_at: string | null;
  /** Liczba pozycji (wierszy) w order_items */
  item_count?: number;
  /** Suma quantity ze wszystkich pozycji */
  items_quantity?: number;
}

export interface OrderDetail extends OrderListItem {
  fulfillment_notes: string | null;
  shipping_street: string | null;
  shipping_postal_code: string | null;
  parcel_locker_id: string | null;
  parcel_locker_name: string | null;
  parcel_locker_address: string | null;
  discount_code: string | null;
  terms_accepted_at: string | null;
  privacy_policy_accepted_at: string | null;
  ip_address: string | null;
  sku: string | null;
  items: OrderItem[];
  calendar: CalendarSummary | null;
}

export interface CalendarSummary {
  id: string | null;
  title: string | null;
  author: string | null;
  tasks: CalendarTask[];
  format: string | null;
  design_url: string | null;
  access_code: string | null;
  is_free: boolean;
  created_at: string | null;
}

export interface CalendarTask {
  day: number;
  task: string;
  status: string;
}

export interface OrdersResponse {
  orders: OrderListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderFilters {
  status?: PaymentStatus | '';
  fulfillment_status?: FulfillmentStatus | '';
  product_type?: ProductType | '';
  delivery_type?: DeliveryType | '';
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PatchOrderRequest {
  fulfillment_status?: FulfillmentStatus;
  fulfillment_notes?: string;
  tracking_number?: string;
  status?: PaymentStatus;
  delivery_type?: DeliveryType;
  parcel_locker_id?: string;
  parcel_locker_name?: string;
  parcel_locker_address?: string;
  customer_name?: string;
  customer_phone?: string;
  shipping_street?: string;
  shipping_city?: string;
  shipping_postal_code?: string;
}

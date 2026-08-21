import type {
  OrderDetail,
  OrderItem,
  OrderListItem,
  OrdersResponse,
  CalendarSummary,
  PaymentStatus,
  FulfillmentStatus,
  ProductType,
  DeliveryType,
} from '../types/order';
import type { CalendarDetail, CalendarTaskDetail } from '../types/calendar';
import { getOrderItemDisplayName } from '@e-advent/products';

/** Surowy wiersz z GET /admin/orders (snake_case z MySQL) */
interface RawOrderListRow {
  id: string;
  order_number?: number | string | null;
  order_number_display?: string | null;
  created_at: string;
  updated_at?: string;
  status: string;
  fulfillment_status: string;
  product_type?: string;
  sku?: string;
  amount: number | string;
  shipping_amount?: number | string;
  currency: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_type?: string;
  shipping_city?: string;
  parcel_locker_id?: string;
  parcel_locker_name?: string;
  tracking_number?: string;
  calendar_id?: string;
  stripe_payment_intent_id?: string;
  item_count?: number | string;
  items_quantity?: number | string;
}

/** Odpowiedź GET /admin/orders/:id — camelCase opakowana w { order } */
interface RawOrderDetail {
  id: string;
  orderNumber?: number | string | null;
  orderNumberDisplay?: string | null;
  calendarId?: string;
  stripePaymentIntentId?: string;
  amount?: number | string;
  shippingAmount?: number | string;
  currency?: string;
  status?: string;
  fulfillmentStatus?: string;
  fulfillmentNotes?: string;
  trackingNumber?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  productType?: string;
  sku?: string;
  deliveryType?: string;
  shipping?: {
    street?: string;
    city?: string;
    postalCode?: string;
  };
  parcelLocker?: {
    id?: string;
    name?: string;
    address?: string;
  } | null;
  termsAcceptedAt?: string;
  privacyPolicyAcceptedAt?: string;
  clientIP?: string;
  rabatCode?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: unknown;
  calendar?: {
    title?: string;
    author?: string;
    format?: string;
    designUrl?: string;
    accessCode?: string;
    isFree?: boolean;
    tasks?: unknown;
    createdAt?: string;
  };
}

interface RawCalendarDetail {
  id: string;
  title?: string;
  author?: string;
  email?: string;
  productType?: string;
  sku?: string;
  format?: string;
  designUrl?: string;
  tasks?: unknown;
  status?: string;
  accessCode?: string;
  isFree?: boolean;
  fulfillmentStatus?: string;
  fulfillmentNotes?: string;
  openingMethod?: string | null;
  dailyContentEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** Numer zamówienia dla klienta: 1 → "000001" */
function formatOrderNumberDisplay(value: number | string | null | undefined): string | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, ''), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return String(n).padStart(6, '0');
}

function toOrderNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Brak product_type + SKU scratch* / santa-letter → typ; w pozostałych przypadkach interaktywny. */
function resolveProductType(
  productType: string | null | undefined,
  sku?: string | null,
): ProductType {
  if (productType === 'scratch' || productType === 'interactive' || productType === 'letter') {
    return productType;
  }
  if (sku && String(sku).startsWith('scratch')) return 'scratch';
  if (sku === 'santa-letter') return 'letter';
  if (sku === 'santa-certificate') return 'letter';
  return 'interactive';
}

function mapOrderItems(raw: unknown): OrderItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, index) => {
    const item = row as Record<string, unknown>;
    const sku = String(item.sku ?? '');
    const metadataRaw = item.metadata;
    const metadata =
      metadataRaw && typeof metadataRaw === 'object'
        ? (metadataRaw as OrderItem['metadata'])
        : undefined;
    return {
      id: String(item.id ?? `${sku}-${index}`),
      sku,
      productType: resolveProductType(
        (item.productType ?? item.product_type) as string | undefined,
        sku,
      ),
      quantity: Math.max(1, Number(item.quantity) || 1),
      unitPrice: toNumber((item.unitPrice ?? item.unit_price) as number | string),
      calendarId: (item.calendarId ?? item.calendar_id ?? null) as string | null,
      metadata,
      displayName: getOrderItemDisplayName(sku, metadata),
    };
  });
}

function normalizeTasks(raw: unknown): CalendarTaskDetail[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t, index) => {
    const item = t as Record<string, unknown>;
    const day = typeof item.day === 'number' ? item.day : Number(item.day) || index + 1;
    const text = String(item.task ?? item.title ?? item.content ?? '').trim();
    return {
      day,
      task: text,
      status: String(item.status ?? 'pending'),
      ...(item.duration != null ? { duration: Number(item.duration) } : {}),
      ...(item.latestDay != null ? { latestDay: Number(item.latestDay) } : {}),
      ...(item.lockedDay != null ? { lockedDay: Number(item.lockedDay) } : {}),
    };
  });
}

export function mapOrderListItem(row: RawOrderListRow): OrderListItem {
  const orderNumber = toOrderNumber(row.order_number);
  return {
    id: String(row.id),
    order_number: orderNumber,
    order_number_display: row.order_number_display ?? formatOrderNumberDisplay(orderNumber),
    calendar_id: row.calendar_id ?? null,
    stripe_payment_intent_id: row.stripe_payment_intent_id ?? null,
    status: (row.status as PaymentStatus) || 'pending',
    fulfillment_status: (row.fulfillment_status as FulfillmentStatus) || 'pending',
    product_type: resolveProductType(row.product_type, row.sku),
    delivery_type: (row.delivery_type as DeliveryType) || 'none',
    customer_name: row.customer_name ?? null,
    customer_email: row.customer_email ?? null,
    customer_phone: row.customer_phone ?? null,
    amount: toNumber(row.amount),
    shipping_amount: row.shipping_amount != null ? toNumber(row.shipping_amount) : 0,
    currency: row.currency || 'pln',
    tracking_number: row.tracking_number ?? null,
    shipping_city: row.shipping_city ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    item_count: row.item_count != null ? Number(row.item_count) : undefined,
    items_quantity: row.items_quantity != null ? Number(row.items_quantity) : undefined,
  };
}

export function mapOrdersResponse(raw: {
  orders: RawOrderListRow[];
  total: number;
  page: number;
  limit: number;
}): OrdersResponse {
  return {
    orders: (raw.orders ?? []).map(mapOrderListItem),
    total: raw.total ?? 0,
    page: raw.page ?? 1,
    limit: raw.limit ?? 20,
  };
}

export function mapOrderDetail(raw: RawOrderDetail): OrderDetail {
  const calendarId = raw.calendarId ?? null;
  let calendar: CalendarSummary | null = null;

  if (raw.calendar && (raw.calendar.title || raw.calendar.author || calendarId)) {
    calendar = {
      id: calendarId,
      title: raw.calendar.title ?? null,
      author: raw.calendar.author ?? null,
      tasks: normalizeTasks(raw.calendar.tasks),
      format: raw.calendar.format ?? null,
      design_url: raw.calendar.designUrl ?? null,
      access_code: raw.calendar.accessCode ?? null,
      is_free: !!raw.calendar.isFree,
      created_at: raw.calendar.createdAt ?? null,
    };
  }

  return {
    id: String(raw.id),
    order_number: toOrderNumber(raw.orderNumber),
    order_number_display: raw.orderNumberDisplay ?? formatOrderNumberDisplay(raw.orderNumber),
    calendar_id: calendarId,
    stripe_payment_intent_id: raw.stripePaymentIntentId ?? null,
    status: (raw.status as PaymentStatus) || 'pending',
    fulfillment_status: (raw.fulfillmentStatus as FulfillmentStatus) || 'pending',
    product_type: resolveProductType(raw.productType, raw.sku),
    delivery_type: (raw.deliveryType as DeliveryType) || 'none',
    customer_name: raw.customerName ?? null,
    customer_email: raw.customerEmail ?? null,
    customer_phone: raw.customerPhone ?? null,
    amount: toNumber(raw.amount),
    shipping_amount: raw.shippingAmount != null ? toNumber(raw.shippingAmount) : 0,
    currency: raw.currency || 'pln',
    tracking_number: raw.trackingNumber ?? null,
    shipping_city: raw.shipping?.city ?? null,
    created_at: raw.createdAt ?? '',
    updated_at: raw.updatedAt ?? null,
    fulfillment_notes: raw.fulfillmentNotes ?? null,
    shipping_street: raw.shipping?.street ?? null,
    shipping_postal_code: raw.shipping?.postalCode ?? null,
    parcel_locker_id: raw.parcelLocker?.id ?? null,
    parcel_locker_name: raw.parcelLocker?.name ?? null,
    parcel_locker_address: raw.parcelLocker?.address ?? null,
    discount_code: raw.rabatCode ?? null,
    terms_accepted_at: raw.termsAcceptedAt ?? null,
    privacy_policy_accepted_at: raw.privacyPolicyAcceptedAt ?? null,
    ip_address: raw.clientIP ?? null,
    sku: raw.sku ?? null,
    items: mapOrderItems(raw.items),
    calendar,
  };
}

/** PATCH zwraca surowy wiersz MySQL (snake_case) w { success, order } */
export function mapPatchedOrder(raw: Record<string, unknown>): OrderDetail {
  const orderNumber = toOrderNumber(raw.order_number as number | string | null | undefined);
  return {
    id: String(raw.id),
    order_number: orderNumber,
    order_number_display: formatOrderNumberDisplay(orderNumber),
    calendar_id: (raw.calendar_id as string) ?? null,
    stripe_payment_intent_id: (raw.stripe_payment_intent_id as string) ?? null,
    status: (raw.status as PaymentStatus) || 'pending',
    fulfillment_status: (raw.fulfillment_status as FulfillmentStatus) || 'pending',
    product_type: resolveProductType(
      raw.product_type as string | undefined,
      raw.sku as string | undefined,
    ),
    delivery_type: (raw.delivery_type as DeliveryType) || 'none',
    customer_name: (raw.customer_name as string) ?? null,
    customer_email: (raw.customer_email as string) ?? null,
    customer_phone: (raw.customer_phone as string) ?? null,
    amount: toNumber(raw.amount as number | string),
    shipping_amount: raw.shipping_amount != null ? toNumber(raw.shipping_amount as number | string) : 0,
    currency: (raw.currency as string) || 'pln',
    tracking_number: (raw.tracking_number as string) ?? null,
    shipping_city: (raw.shipping_city as string) ?? null,
    created_at: (raw.created_at as string) ?? '',
    updated_at: (raw.updated_at as string) ?? null,
    fulfillment_notes: (raw.fulfillment_notes as string) ?? null,
    shipping_street: (raw.shipping_street as string) ?? null,
    shipping_postal_code: (raw.shipping_postal_code as string) ?? null,
    parcel_locker_id: (raw.parcel_locker_id as string) ?? null,
    parcel_locker_name: (raw.parcel_locker_name as string) ?? null,
    parcel_locker_address: (raw.parcel_locker_address as string) ?? null,
    discount_code: (raw.rabat_code as string) ?? null,
    terms_accepted_at: (raw.terms_accepted_at as string) ?? null,
    privacy_policy_accepted_at: (raw.privacy_policy_accepted_at as string) ?? null,
    ip_address: (raw.client_ip as string) ?? null,
    sku: (raw.sku as string) ?? null,
    items: mapOrderItems(raw.items),
    calendar: null,
  };
}

export function mapCalendarDetail(raw: RawCalendarDetail): CalendarDetail {
  return {
    id: String(raw.id),
    title: raw.title ?? '',
    author: raw.author ?? '',
    customer_email: raw.email ?? null,
    sku: raw.sku ?? null,
    format: raw.format ?? '',
    design_url: raw.designUrl ?? null,
    access_code: raw.accessCode ?? null,
    fulfillment_status: raw.fulfillmentStatus ?? 'pending',
    status: raw.status ?? 'pending',
    opening_method: raw.openingMethod ?? null,
    daily_content_email: raw.dailyContentEmail ?? null,
    tasks: normalizeTasks(raw.tasks),
    created_at: raw.createdAt ?? '',
    updated_at: raw.updatedAt ?? '',
  };
}

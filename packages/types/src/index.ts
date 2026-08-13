export type ProductType = 'interactive' | 'scratch' | 'letter';
export type CalendarFormat = 'A4' | 'A3';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed';
export type FulfillmentStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'hold';
export type DeliveryType = 'none' | 'poczta_polska' | 'courier_inpost' | 'parcel_inpost';
export type TaskWindowStatus = 'opened' | 'closed';

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  postalCode: string;
  phone: string;
  country: string;
}

export interface DesignSelection {
  source: 'preset' | 'custom';
  presetId?: string;
  imageUrl: string;
  imageKey?: string;
}

export interface CalendarTaskInput {
  task: string;
  day?: number;
  duration?: number;
  lockedDay?: number;
  latestDay?: number;
}

export interface CreatorFormData {
  name: string;
  email: string;
  calendarTitle: string;
  dailyEmailReminders: boolean;
}

export interface OrderCalendarData extends CreatorFormData {
  productType: ProductType;
  sku: string;
  format?: CalendarFormat;
  design?: DesignSelection;
  shippingAddress?: ShippingAddress;
  tasks: CalendarTaskInput[];
  selectedExampleSets?: number[];
  dates?: string[];
}

/** API calendar task shape (mobile / storefront access). */
export interface CalendarApiTask {
  title: string;
  day: number;
  status: TaskWindowStatus;
  latestDay?: number;
  duration?: number;
}

export interface CalendarPayload {
  id: string;
  title: string;
  author: string;
  email: string;
  creation?: string;
  modified?: string;
  status?: string;
  tasks: CalendarApiTask[];
}

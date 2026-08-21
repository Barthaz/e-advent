import type { ProductType } from '@e-advent/types';

export interface CalendarTaskDetail {
  day: number;
  /** Opcjonalny tytuł dnia (zdrapka) */
  title?: string;
  /** Tekst zadania / opis */
  task: string;
  status: string;
  duration?: number;
  latestDay?: number;
  lockedDay?: number;
}

export interface CalendarDetail {
  id: string;
  title: string;
  author: string;
  customer_email: string | null;
  product_type: ProductType;
  sku: string | null;
  format: string;
  design_url: string | null;
  access_code: string | null;
  fulfillment_status: string;
  status: string;
  opening_method: string | null;
  daily_content_email: string | null;
  tasks: CalendarTaskDetail[];
  created_at: string;
  updated_at: string;
}

export interface PatchCalendarRequest {
  title?: string;
  author?: string;
  email?: string;
  fulfillment_notes?: string;
  tasks?: Array<{
    day: number;
    title: string;
    description?: string;
    task?: string;
    status: string;
    duration?: number;
    latestDay?: number;
    lockedDay?: number;
  }>;
}

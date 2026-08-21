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
/** How the recipient opens daily Advent windows (interactive calendar). */
export type OpeningMethod = 'app' | 'email' | 'online';

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  phone: string;
  country: string;
  /**
   * Złożone imię+nazwisko (API / e-mail / DB `customer_name`).
   * Ustawiane przy zapisie; przy starych danych może być jedynym polem nazwy.
   */
  fullName?: string;
}


export interface DesignSelection {
  source: 'preset' | 'custom';
  presetId?: string;
  imageUrl: string;
  imageKey?: string;
}

export interface CalendarTaskInput {
  /** Treść zadania / opis dnia */
  task: string;
  /** Opcjonalny tytuł dnia (kalendarz zdrapka) */
  title?: string;
  day?: number;
  catalogTaskId?: string;
  duration?: number;
  lockedDay?: number;
  latestDay?: number;
}

/** Tryb treści kalendarza zdrapki: gotowa przygoda albo własne zadania. */
export type ScratchContentMode = 'preset' | 'custom';

export interface CreatorFormData {
  name: string;
  email: string;
  calendarTitle: string;
  dailyEmailReminders: boolean;
  /** Interactive: preferred way to open daily windows. */
  openingMethod?: OpeningMethod;
  /** Interactive + email method: inbox for daily window content. */
  dailyContentEmail?: string;
}

export interface OrderCalendarData extends CreatorFormData {
  productType: ProductType;
  sku: string;
  format?: CalendarFormat;
  design?: DesignSelection;
  shippingAddress?: ShippingAddress;
  tasks: CalendarTaskInput[];
  /** Interaktywny: indeksy zestawów z examples.json */
  selectedExampleSets?: number[];
  /** Zdrapka: indeks jednej predefiniowanej przygody (0–2) */
  selectedScratchPreset?: number | null;
  /** Zdrapka: tryb treści */
  scratchContentMode?: ScratchContentMode;
  /** Zdrapka (własne): czy przetasować kolejność zadań */
  shuffleCustomTasks?: boolean;
  dates?: string[];
}

/** API calendar task shape (mobile / storefront access). */
export interface CalendarApiTask {
  /**
   * Interaktywny: treść okienka.
   * Zdrapka: opcjonalny tytuł dnia (gdy jest też `description` / `text`).
   */
  title: string;
  day: number;
  status: TaskWindowStatus;
  /** Zdrapka: treść pod tytułem (gdy ustawione, `title` = nagłówek dnia). */
  description?: string;
  /** Alias treści ciała (zdrapka / eksport). */
  text?: string;
  latestDay?: number;
  duration?: number;
  /** Set server-side; never exposed before window open for premium metadata */
  catalogTaskId?: string;
  isSpecial?: boolean;
  special?: SpecialWindowDescriptor;
}

export type SpecialEngineType =
  | 'QUIZ'
  | 'CHECKLIST'
  | 'RANDOMIZER_TIMER'
  | 'CARD_FORM'
  | 'DOCUMENT'
  | 'RECIPE'
  | 'SCORECARD'
  | 'IMAGE_CARD'
  | 'SORTABLE_LIST'
  | 'PLANNER'
  | 'MONTH_PLANNER'
  | 'OPTION_CONFIGURATOR'
  | 'TURN_BASED_GAME'
  | 'TEMPLATE_PERSONALIZER';

export type SpecialProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface CompletionRule {
  type: string;
  minItems?: number;
  requiredFields?: string[];
}

export interface DocumentCapability {
  templateId: string;
  version: number;
  variants?: Array<'COLOR' | 'INK_SAVER'>;
  defaultPage?: 'A4' | 'A5' | 'A6' | 'A3';
}

export interface SpecialWindowDescriptor {
  configId: string;
  engine: SpecialEngineType;
  variant?: string;
  version: number;
  headline: string;
  description?: string;
  contentKey?: string;
  uiPreset?: string;
  document?: DocumentCapability;
  completionRule: CompletionRule;
  capabilities?: {
    canShareImage?: boolean;
    canPrint?: boolean;
    /** Lists/rankings/letters on mobile; games and DIY stay web-only. */
    canPrintMobile?: boolean;
    dateGate?: boolean;
  };
  config: Record<string, unknown>;
}

export interface OpenedCalendarWindow {
  taskId: string;
  day: number;
  state: 'OPENED' | 'COMPLETED';
  title: string;
  text: string;
  isSpecial: boolean;
  special?: SpecialWindowDescriptor;
}

export interface SpecialWindowProgress {
  taskId: string;
  configId: string;
  status: SpecialProgressStatus;
  payloadVersion: number;
  payload: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface OpenDayResponse {
  success: boolean;
  message?: string;
  calendar: CalendarPayload;
  openedWindow?: OpenedCalendarWindow;
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

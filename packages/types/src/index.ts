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
  catalogTaskId?: string;
  duration?: number;
  lockedDay?: number;
  latestDay?: number;
}

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

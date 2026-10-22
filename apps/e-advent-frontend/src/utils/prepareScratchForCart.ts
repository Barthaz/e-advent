import { createCalendar, type InternalCalendarData } from '../api/api';
import type {
  CalendarFormat,
  CalendarTaskInput,
  DesignSelection,
  ProductType,
  ScratchContentMode,
} from '../types/order';
import {
  buildScratchCalendarTasks,
  type ScratchPreset,
} from './scratchCalendarGenerator';
import {
  clearPendingCalendarSession,
  getReusablePendingCalendarId,
  setPendingCalendarSession,
} from './creatorStorage';
import scratchPresetsData from '../data/scratch-presets.json';
import { DEFAULT_SCRATCH_TITLE } from '../data/scratchColors';

export interface ScratchCartPrepareInput {
  name?: string;
  email?: string;
  calendarTitle?: string;
  tasks: CalendarTaskInput[];
  scratchContentMode: ScratchContentMode;
  selectedScratchPreset: number | null;
  shuffleCustomTasks: boolean;
  dailyEmailReminders?: boolean;
  productType: ProductType;
  sku: string;
  format: CalendarFormat;
  design: DesignSelection;
}

/**
 * Creates/updates a pending scratch calendar on the API so it can be added to cart with calendarId.
 * Buyer name/email are collected at checkout, not on the product page.
 */
export async function prepareScratchCalendarForCart(input: ScratchCartPrepareInput): Promise<{
  calendarId: string;
  editToken: string;
}> {
  const presets = scratchPresetsData as ScratchPreset[];
  const generatedTasks = buildScratchCalendarTasks({
    presets,
    mode: input.scratchContentMode,
    selectedPreset: input.selectedScratchPreset,
    customTasks: input.tasks,
    shuffleCustomTasks: input.shuffleCustomTasks,
  }).sort((a, b) => a.day - b.day);

  const calendarDataToSave: InternalCalendarData = {
    name: input.name?.trim() || undefined,
    email: input.email?.trim() || undefined,
    calendarTitle: input.calendarTitle?.trim() || DEFAULT_SCRATCH_TITLE,
    tasks: generatedTasks,
    dailyEmailReminders: input.dailyEmailReminders || false,
    productType: input.productType,
    sku: input.sku,
    format: input.format,
    design: input.design,
    fulfillmentStatus: 'pending',
  };

  const existingId = getReusablePendingCalendarId();
  const response = await createCalendar(calendarDataToSave, existingId || undefined);
  const calendarId = response.calendar?.id;
  const editToken = response.editToken || localStorage.getItem('e-advent-pending-edit-token');

  if (!calendarId) {
    throw new Error('Nie otrzymano calendarId z serwera.');
  }
  if (!editToken) {
    throw new Error('Nie otrzymano editToken z serwera.');
  }

  setPendingCalendarSession(calendarId, editToken);
  // Cart holds the calendarId; clear pending so another scratch can be designed next
  clearPendingCalendarSession();

  return { calendarId, editToken };
}

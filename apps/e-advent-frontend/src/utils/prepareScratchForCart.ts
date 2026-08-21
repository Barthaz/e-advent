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
  getStorageKeys,
  setPendingCalendarSession,
} from './creatorStorage';
import scratchPresetsData from '../data/scratch-presets.json';

export interface ScratchCartPrepareInput {
  name: string;
  email: string;
  calendarTitle: string;
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
 */
export async function prepareScratchCalendarForCart(input: ScratchCartPrepareInput): Promise<{
  calendarId: string;
  editToken: string;
}> {
  const presets = scratchPresetsData as ScratchPreset[];
  const keys = getStorageKeys(input.productType);

  let generatedTasks: Array<{
    day: number;
    task: string;
    title?: string;
  }> = [];

  const savedGenerated = localStorage.getItem(keys.generatedCalendar)
    || localStorage.getItem('e-advent-generated-calendar');

  if (savedGenerated) {
    try {
      const parsed = JSON.parse(savedGenerated) as Array<{
        day: number;
        task: string;
        title?: string;
      }>;
      generatedTasks = parsed.map(({ day, task, title }) => ({
        day,
        task,
        ...(title?.trim() ? { title: title.trim() } : {}),
      }));
    } catch {
      generatedTasks = [];
    }
  }

  if (generatedTasks.length === 0) {
    generatedTasks = buildScratchCalendarTasks({
      presets,
      mode: input.scratchContentMode,
      selectedPreset: input.selectedScratchPreset,
      customTasks: input.tasks,
      shuffleCustomTasks: input.shuffleCustomTasks,
    });
  }

  generatedTasks = generatedTasks.sort((a, b) => a.day - b.day);

  const calendarDataToSave: InternalCalendarData = {
    name: input.name,
    email: input.email,
    calendarTitle: input.calendarTitle,
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

import type { CalendarTaskInput } from '../types/order';

export interface ScratchPresetTask {
  day: number;
  title: string;
  description: string;
}

export interface ScratchPreset {
  name: string;
  shortDescription: string;
  fullDescription: string;
  tasks: ScratchPresetTask[];
}

export interface GeneratedScratchDay {
  day: number;
  /** Treść / opis */
  task: string;
  /** Opcjonalny tytuł dnia */
  title?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Buduje 24 dni z wybranej przygody — stała kolejność z pliku presetów.
 */
export function buildScratchTasksFromPreset(
  presets: ScratchPreset[],
  presetIndex: number
): GeneratedScratchDay[] {
  const preset = presets[presetIndex];
  if (!preset?.tasks?.length) return [];

  return [...preset.tasks]
    .sort((a, b) => a.day - b.day)
    .map((t) => ({
      day: t.day,
      task: t.description,
      ...(t.title?.trim() ? { title: t.title.trim() } : {}),
    }));
}

/**
 * Buduje dni z własnych zadań (max 24): kolejność zachowana lub przetasowana.
 */
export function buildScratchTasksFromCustom(
  userTasks: CalendarTaskInput[],
  shuffle: boolean
): GeneratedScratchDay[] {
  const cleaned = userTasks
    .map((t) => ({
      task: (t.task || '').trim(),
      title: t.title?.trim() || undefined,
    }))
    .filter((t) => t.task.length > 0)
    .slice(0, 24);

  const ordered = shuffle ? shuffleArray(cleaned) : cleaned;

  return ordered.map((t, index) => ({
    day: index + 1,
    task: t.task,
    ...(t.title ? { title: t.title } : {}),
  }));
}

export function buildScratchCalendarTasks(options: {
  presets: ScratchPreset[];
  mode: 'preset' | 'custom';
  selectedPreset: number | null;
  customTasks: CalendarTaskInput[];
  shuffleCustomTasks: boolean;
}): GeneratedScratchDay[] {
  if (options.mode === 'preset' && options.selectedPreset != null) {
    return buildScratchTasksFromPreset(options.presets, options.selectedPreset);
  }
  return buildScratchTasksFromCustom(options.customTasks, options.shuffleCustomTasks);
}

export function validateScratchTasksStep(options: {
  presets: ScratchPreset[];
  mode: 'preset' | 'custom';
  selectedPreset: number | null;
  customTasks: CalendarTaskInput[];
}): ValidationResult {
  if (options.mode === 'preset') {
    if (options.selectedPreset == null || !options.presets[options.selectedPreset]) {
      return {
        valid: false,
        error: 'Wybierz jedną ze świątecznych przygód albo stwórz własne zadania.',
      };
    }
    const count = options.presets[options.selectedPreset].tasks?.length ?? 0;
    if (count < 1) {
      return { valid: false, error: 'Wybrana przygoda nie ma zadań.' };
    }
    return { valid: true };
  }

  const cleaned = options.customTasks
    .map((t) => (t.task || '').trim())
    .filter(Boolean);

  if (cleaned.length === 0) {
    return {
      valid: false,
      error: 'Dodaj co najmniej jedno zadanie albo wybierz gotową świąteczną przygodę.',
    };
  }
  if (cleaned.length > 24) {
    return { valid: false, error: 'Maksymalnie 24 zadania — po jednym na każde okienko.' };
  }
  if (new Set(cleaned.map((t) => t.toLowerCase())).size !== cleaned.length) {
    return { valid: false, error: 'Zadania muszą być unikalne — usuń duplikaty.' };
  }
  return { valid: true };
}

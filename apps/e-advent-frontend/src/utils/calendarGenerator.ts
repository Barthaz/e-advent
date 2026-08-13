interface CalendarTask {
  day?: number; // Opcjonalne - używane tylko w interfejsie formularza
  task: string;
  duration?: number;
  lockedDay?: number; // Dzień, w którym zadanie musi być (np. 6 grudnia)
  latestDay?: number; // Najpóźniejszy dzień, w którym zadanie może być (np. 10 grudnia)
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Waliduje, czy można wygenerować kalendarz z podanymi ograniczeniami
 */
export function validateCalendarConfiguration(tasks: CalendarTask[]): ValidationResult {
  const lockedDays = new Set<number>();
  const lockedTasks: CalendarTask[] = [];
  const unconstrainedTasks: CalendarTask[] = [];
  
  // Podziel zadania na te z blokadą dnia i te bez
  for (const task of tasks) {
    if (task.lockedDay !== undefined && task.lockedDay !== null) {
      const day = task.lockedDay;
      
      // Sprawdź zakres dnia
      if (day < 1 || day > 24) {
        return {
          valid: false,
          error: `Zadanie "${task.task}" ma zablokowany dzień ${day}, ale musi być między 1 a 24.`,
        };
      }
      
      // Sprawdź, czy dzień nie jest już zajęty
      if (lockedDays.has(day)) {
        return {
          valid: false,
          error: `Dzień ${day} jest zablokowany przez więcej niż jedno zadanie. Każdy dzień może mieć tylko jedno zadanie.`,
        };
      }
      
      // Sprawdź, czy latestDay jest większe lub równe lockedDay
      if (task.latestDay !== undefined && task.latestDay !== null) {
        if (task.latestDay < task.lockedDay) {
          return {
            valid: false,
            error: `Zadanie "${task.task}" ma zablokowany dzień ${task.lockedDay}, ale najpóźniejszy możliwy dzień (${task.latestDay}) jest wcześniejszy.`,
          };
        }
      }
      
      lockedDays.add(day);
      lockedTasks.push(task);
    } else {
      unconstrainedTasks.push(task);
    }
  }
  
  // Dla zadań z latestDay, sprawdź czy można je umieścić
  for (const task of unconstrainedTasks) {
    if (task.latestDay !== undefined && task.latestDay !== null) {
      const latestDay = task.latestDay;
      
      // Sprawdź zakres
      if (latestDay < 1 || latestDay > 24) {
        return {
          valid: false,
          error: `Zadanie "${task.task}" ma najpóźniejszy dzień ${latestDay}, ale musi być między 1 a 24.`,
        };
      }
      
      // Sprawdź, ile wolnych dni jest dostępnych przed latestDay
      let availableDays = 0;
      for (let day = 1; day <= latestDay; day++) {
        if (!lockedDays.has(day)) {
          availableDays++;
        }
      }
      
      if (availableDays === 0) {
        return {
          valid: false,
          error: `Zadanie "${task.task}" wymaga umieszczenia najpóźniej ${latestDay} grudnia, ale wszystkie dni do ${latestDay} są już zajęte przez inne zablokowane zadania.`,
        };
      }
    }
  }
  
  // Sprawdź, czy liczba zadań nie przekracza 24
  if (tasks.length > 24) {
    return {
      valid: false,
      error: `Za dużo zadań (${tasks.length}). Maksymalnie można dodać 24 zadania (jeden na każdy dzień).`,
    };
  }
  
  return { valid: true };
}

/**
 * Losuje i przypisuje zadania do dni, uwzględniając ograniczenia
 */
export function generateCalendarWithConstraints(tasks: CalendarTask[]): Map<number, CalendarTask & { day: number }> {
  const result = new Map<number, CalendarTask & { day: number }>();
  
  // Najpierw umieść zadania z lockedDay
  const lockedTasks: CalendarTask[] = [];
  const unconstrainedTasks: CalendarTask[] = [];
  
  for (const task of tasks) {
    if (task.lockedDay !== undefined && task.lockedDay !== null) {
      lockedTasks.push(task);
      result.set(task.lockedDay, { ...task, day: task.lockedDay });
    } else {
      unconstrainedTasks.push(task);
    }
  }
  
  // Utwórz listę dostępnych dni (nie zajętych przez lockedTasks)
  const availableDays: number[] = [];
  for (let day = 1; day <= 24; day++) {
    if (!result.has(day)) {
      availableDays.push(day);
    }
  }
  
  // Dla zadań z latestDay, ogranicz dostępne dni
  const tasksWithLatestDay: CalendarTask[] = [];
  const tasksWithoutConstraints: CalendarTask[] = [];
  
  for (const task of unconstrainedTasks) {
    if (task.latestDay !== undefined && task.latestDay !== null) {
      tasksWithLatestDay.push(task);
    } else {
      tasksWithoutConstraints.push(task);
    }
  }
  
  // Najpierw umieść zadania z latestDay (sortuj od najwcześniejszego latestDay)
  tasksWithLatestDay.sort((a, b) => (a.latestDay || 24) - (b.latestDay || 24));
  
  for (const task of tasksWithLatestDay) {
    const latestDay = task.latestDay || 24;
    const eligibleDays = availableDays.filter(day => day <= latestDay);
    
    if (eligibleDays.length === 0) {
      // To nie powinno się zdarzyć po walidacji, ale na wszelki wypadek
      console.warn(`Nie można umieścić zadania "${task.task}" przed ${latestDay} grudnia.`);
      continue;
    }
    
    // Losuj dzień z dostępnych
    const randomIndex = Math.floor(Math.random() * eligibleDays.length);
    const selectedDay = eligibleDays[randomIndex];
    result.set(selectedDay, { ...task, day: selectedDay });
    availableDays.splice(availableDays.indexOf(selectedDay), 1);
  }
  
  // Następnie umieść pozostałe zadania losowo
  const shuffledDays = [...availableDays].sort(() => Math.random() - 0.5);
  tasksWithoutConstraints.forEach((task, index) => {
    if (index < shuffledDays.length) {
      const selectedDay = shuffledDays[index];
      result.set(selectedDay, { ...task, day: selectedDay });
      // Usuń dzień z availableDays po użyciu
      const dayIndex = availableDays.indexOf(selectedDay);
      if (dayIndex > -1) {
        availableDays.splice(dayIndex, 1);
      }
    }
  });
  
  // NIE wypełniamy pustych dni domyślnymi zadaniami
  // Wypełnianie pustych dni jest obsługiwane w komponentach (Creator.tsx, Checkout.tsx, Preview.tsx)
  // używając zadań z wybranych sekcji z examples.json
  
  return result;
}

function normalizeTaskText(task: string): string {
  return task.trim().toLowerCase();
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
 * Liczy unikalne zadania dostępne w wybranych zestawach, z pominięciem już użytych tekstów.
 */
export function countUniqueAvailableExampleTasks(
  exampleSets: Array<{ tasks?: string[] }>,
  selectedSetIndices: number[],
  excludeTexts: Iterable<string> = []
): number {
  const exclude = new Set([...excludeTexts].map(normalizeTaskText));
  const seen = new Set<string>();

  for (const setIndex of selectedSetIndices) {
    const set = exampleSets[setIndex];
    if (!set?.tasks) continue;
    for (const task of set.tasks) {
      const key = normalizeTaskText(task);
      if (!exclude.has(key) && !seen.has(key)) {
        seen.add(key);
      }
    }
  }

  return seen.size;
}

/**
 * Losuje unikalne zadania z puli — bez powtórzeń i bez tekstów już użytych w kalendarzu.
 */
export function pickUniqueTasksFromPool(
  pool: string[],
  count: number,
  excludeTexts: Iterable<string> = []
): string[] {
  const exclude = new Set([...excludeTexts].map(normalizeTaskText));
  const uniquePool: string[] = [];
  const seen = new Set<string>();

  for (const task of pool) {
    const key = normalizeTaskText(task);
    if (!seen.has(key) && !exclude.has(key)) {
      seen.add(key);
      uniquePool.push(task);
    }
  }

  return shuffleArray(uniquePool).slice(0, count);
}

/**
 * Uzupełnia brakujące dni zadaniami z wybranych zestawów — każde zadanie tylko raz.
 */
export function fillMissingDaysWithExampleTasks(
  taskMap: Map<number, CalendarTask & { day: number }>,
  missingDays: number[],
  exampleSets: Array<{ tasks?: string[] }>,
  selectedSetIndices: number[]
): void {
  if (missingDays.length === 0 || selectedSetIndices.length === 0) return;

  const usedTexts = [...taskMap.values()].map((t) => t.task);
  const pool: string[] = [];
  for (const setIndex of selectedSetIndices) {
    const set = exampleSets[setIndex];
    if (set?.tasks) pool.push(...set.tasks);
  }

  const picked = pickUniqueTasksFromPool(pool, missingDays.length, usedTexts);
  missingDays.forEach((day, index) => {
    if (picked[index]) {
      taskMap.set(day, { task: picked[index], day });
    }
  });
}

export type GeneratedCalendarDay = {
  day: number;
  task: string;
  duration?: number;
  latestDay?: number;
};

/**
 * Buduje pełny kalendarz 24 dni: własne zadania + unikalne uzupełnienie z zestawów.
 */
export function buildCalendarTasks(
  userTasks: CalendarTask[],
  exampleSets: Array<{ tasks?: string[] }>,
  selectedSetIndices: number[]
): GeneratedCalendarDay[] {
  const taskMap = generateCalendarWithConstraints(userTasks);
  const missingDays: number[] = [];
  for (let day = 1; day <= 24; day++) {
    if (!taskMap.has(day)) missingDays.push(day);
  }

  fillMissingDaysWithExampleTasks(taskMap, missingDays, exampleSets, selectedSetIndices);

  const result: GeneratedCalendarDay[] = [];
  for (let day = 1; day <= 24; day++) {
    const taskData = taskMap.get(day);
    if (taskData) {
      result.push({
        day,
        task: taskData.task,
        duration: taskData.duration,
        ...(taskData.latestDay !== undefined ? { latestDay: taskData.latestDay } : {}),
      });
    }
  }
  return result;
}

/**
 * Sprawdza, czy jest wystarczająco unikalnych zadań na 24 dni adwentu.
 */
export function validateExampleSetsCoverage(
  userTasks: CalendarTask[],
  exampleSets: Array<{ tasks?: string[] }>,
  selectedSetIndices: number[]
): ValidationResult {
  const userTexts = userTasks.map((t) => normalizeTaskText(t.task));
  if (new Set(userTexts).size !== userTexts.length) {
    return { valid: false, error: 'Zadania muszą być unikalne — usuń duplikaty.' };
  }

  const taskMap = generateCalendarWithConstraints(userTasks);
  const missingCount = 24 - taskMap.size;

  if (missingCount === 0) {
    return { valid: true };
  }

  if (selectedSetIndices.length === 0) {
    return {
      valid: false,
      error: 'Musisz mieć 24 własne zadania LUB wybrać co najmniej jedną kategorię zadań.',
    };
  }

  const usedTexts = [...taskMap.values()].map((t) => t.task);
  const available = countUniqueAvailableExampleTasks(exampleSets, selectedSetIndices, usedTexts);

  if (available < missingCount) {
    return {
      valid: false,
      error: `Za mało unikalnych zadań w wybranych kategoriach. Potrzebujesz jeszcze ${missingCount}, dostępnych jest ${available} unikalnych.`,
    };
  }

  return { valid: true };
}


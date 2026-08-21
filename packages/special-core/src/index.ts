import type { CompletionRule, SpecialEngineType, SpecialWindowProgress } from '@e-advent/types';

export type { SpecialEngineType, SpecialWindowProgress };

export interface CompletionState {
  canComplete: boolean;
  reason?: string;
}

export function canCompleteEngine(args: {
  engine: SpecialEngineType;
  completionRule: CompletionRule;
  payload: Record<string, unknown>;
}): CompletionState {
  const { engine, completionRule, payload } = args;

  if (payload.manualComplete === true) {
    return { canComplete: true };
  }

  switch (engine) {
    case 'QUIZ':
      return payload.finished === true
        ? { canComplete: true }
        : { canComplete: false, reason: 'Ukończ quiz' };

    case 'CHECKLIST': {
      if (Array.isArray(payload.houses)) {
        const scored = payload.houses.filter((house) => {
          if (!house || typeof house !== 'object') return false;
          return Number((house as { points?: unknown }).points) > 0;
        }).length;
        if (scored >= (completionRule.minItems ?? 1)) {
          return { canComplete: true };
        }
        return { canComplete: false, reason: 'Przyznaj punkty przynajmniej jednemu domowi' };
      }
      const checked = (payload.checked as Record<string, boolean>) || {};
      const count = Object.values(checked).filter(Boolean).length;
      if (completionRule.type === 'BINGO_LINE_OR_MANUAL' && payload.bingoLine === true) {
        return { canComplete: true };
      }
      if (count >= (completionRule.minItems ?? 1)) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Zaznacz wymagane pozycje' };
    }

    case 'CARD_FORM': {
      const fields = (payload.fields as Record<string, string>) || {};
      const required = completionRule.requiredFields ?? [];
      const missing = required.filter((f) => !String(fields[f] ?? '').trim());
      if (missing.length === 0) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Wypełnij wymagane pola' };
    }

    case 'PLANNER':
    case 'MONTH_PLANNER': {
      const rows = (payload.rows as unknown[]) || [];
      if (rows.length >= (completionRule.minItems ?? 1)) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Dodaj co najmniej jedną pozycję' };
    }

    case 'SCORECARD': {
      const scores = (payload.scores as Record<string, number>) || {};
      const min = completionRule.minItems ?? 1;
      if (Object.keys(scores).length >= min) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Oceń wymagane pozycje' };
    }

    case 'SORTABLE_LIST': {
      const items = (payload.items as unknown[]) || [];
      if (items.length >= (completionRule.minItems ?? 3)) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Ustaw wymaganą liczbę pozycji' };
    }

    case 'DOCUMENT':
    case 'RANDOMIZER_TIMER':
    case 'OPTION_CONFIGURATOR':
    case 'TURN_BASED_GAME':
    case 'TEMPLATE_PERSONALIZER':
    case 'RECIPE':
      return payload.started === true
        ? { canComplete: true }
        : { canComplete: false, reason: 'Rozpocznij interakcję' };

    case 'IMAGE_CARD': {
      const photos = (payload.photos as Record<string, unknown>) || {};
      const filled = Object.values(photos).filter((item) => {
        if (!item) return false;
        if (typeof item === 'string') return item.trim() !== '';
        if (typeof item !== 'object' || Array.isArray(item)) return false;
        const row = item as Record<string, unknown>;
        return !!(row.url || row.dataUrl);
      }).length;
      if (filled >= 2 || payload.imageDataUrl) {
        return { canComplete: true };
      }
      if (payload.started === true && filled >= 1) {
        return { canComplete: true };
      }
      return { canComplete: false, reason: 'Dodaj zdjęcia' };
    }

    default:
      return { canComplete: false, reason: 'Nieznany silnik' };
  }
}

/** Deterministic shuffle using taskId + seed */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const result = [...items];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  for (let i = result.length - 1; i > 0; i--) {
    h = (Math.imul(1664525, h) + 1013904223) | 0;
    const j = ((h >>> 0) % (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createInitialProgress(taskId: string, configId: string): SpecialWindowProgress {
  const now = new Date().toISOString();
  return {
    taskId,
    configId,
    status: 'NOT_STARTED',
    payloadVersion: 1,
    payload: {},
    updatedAt: now,
  };
}

export function migrateProgress(
  progress: SpecialWindowProgress,
  targetVersion: number
): SpecialWindowProgress {
  if (progress.payloadVersion >= targetVersion) return progress;
  return { ...progress, payloadVersion: targetVersion };
}

export function bingoBoardStatus(
  items: string[],
  checked: Record<string, boolean>,
  size = 3
): { hasLine: boolean; blackout: boolean } {
  const n = size * size;
  const flags = items.slice(0, n).map((item) => !!checked[item]);
  while (flags.length < n) flags.push(false);

  const lines: number[][] = [];
  for (let r = 0; r < size; r++) {
    lines.push(Array.from({ length: size }, (_, c) => r * size + c));
  }
  for (let c = 0; c < size; c++) {
    lines.push(Array.from({ length: size }, (_, r) => r * size + c));
  }
  lines.push(Array.from({ length: size }, (_, i) => i * size + i));
  lines.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)));

  const hasLine = lines.some((line) => line.every((i) => flags[i]));
  const blackout = flags.length === n && flags.every(Boolean);
  return { hasLine, blackout };
}

/** Templates worth saving from a phone — lists, rankings, letters. Not live games or DIY cutouts. */
export const MOBILE_PRINTABLE_TEMPLATES = new Set([
  'checklist-v1',
  'inventory-v1',
  'gift-planner-v1',
  'planner-v1',
  'month-planner-v1',
  'ranking-v1',
  'suggestion-list-v1',
  'audit-v1',
  'steps-summary-v1',
  'memory-list-v1',
  'checklist-summary-v1',
  'santa-adult-letter-v1',
  'private-letter-v1',
  'prediction-v1',
  'detective-report-v1',
  'then-now-v1',
  'score-summary-v1',
]);

export type PrintableDescriptor = {
  engine?: string;
  variant?: string;
  contentKey?: string;
  document?: { templateId?: string };
  capabilities?: { canPrint?: boolean; canPrintMobile?: boolean };
};

export function isMobilePrintable(descriptor: PrintableDescriptor): boolean {
  if (descriptor.capabilities?.canPrint === false) return false;
  if (descriptor.capabilities?.canPrintMobile === false) return false;
  const templateId = descriptor.document?.templateId;
  if (!templateId) return false;
  if (descriptor.capabilities?.canPrintMobile === true) return true;
  return MOBILE_PRINTABLE_TEMPLATES.has(templateId);
}

/**
 * Lists/letters: fill in and download a ready card (www + mobile).
 * Games/DIY: play here, paper is a www-only souvenir.
 */
export function printableHint(descriptor: PrintableDescriptor): string | null {
  if (descriptor.capabilities?.canPrint === false || !descriptor.document?.templateId) {
    return null;
  }

  const templateId = descriptor.document.templateId;
  const engine = String(descriptor.engine || '');
  const variant = String(descriptor.variant || '').toUpperCase();

  if (isMobilePrintable(descriptor)) {
    if (templateId === 'santa-adult-letter-v1' || templateId === 'private-letter-v1') {
      return 'Uzupełnij list tutaj i pobierz gotową kartkę.';
    }
    if (templateId === 'prediction-v1') {
      return 'Uzupełnij imię i przepowiednie, pobierz PDF, a potem podaj urządzenie następnej osobie.';
    }
    if (templateId === 'detective-report-v1') {
      return 'Wpisz imiona i typy, potem pobierz raport PDF — kto na co stawiał.';
    }
    if (templateId === 'then-now-v1') {
      return 'Dodaj zdjęcie „wtedy” i „dziś”, potem pobierz poziomą kartę PDF.';
    }
    if (templateId === 'score-summary-v1') {
      return 'Zagraj tutaj albo pobierz kartę i zaznaczaj punkty na papierze — jak w bingo.';
    }
    if (templateId === 'ranking-v1') {
      return 'Ułóż ranking tutaj i pobierz gotową kartę.';
    }
    if (
      templateId === 'gift-planner-v1'
      || templateId === 'planner-v1'
      || templateId === 'month-planner-v1'
    ) {
      return 'Uzupełnij planer tutaj i pobierz gotową kartę.';
    }
    return 'Uzupełnij listę tutaj i pobierz gotową kartę.';
  }

  if (engine === 'CHECKLIST' && variant === 'BINGO') {
    return 'Zagraj tutaj, na ekranie — albo pobierz kartę do gry, wydrukuj ją i rozłóż na stole. Magia zostaje ta sama.';
  }
  if (engine === 'RECIPE') {
    return 'Możesz korzystać z przepisu tutaj — albo pobrać kartę, wydrukować ją i zabrać ze sobą do kuchni.';
  }
  if (engine === 'DOCUMENT' || engine === 'TEMPLATE_PERSONALIZER') {
    return 'Możesz przejść przez to zadanie tutaj — albo pobrać szablon, wydrukować go i zrobić wszystko własnymi rękami.';
  }

  return 'Możesz przeżyć to zadanie tutaj, na ekranie — albo pobrać kartę, wydrukować ją i usiąść z nią przy stole. Obie drogi prowadzą do tego samego grudniowego wieczoru.';
}

export function remainingTimerSeconds(startedAt?: string, duration = 60, now = Date.now()): number {
  if (!startedAt) return duration;
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return duration;
  return Math.max(0, duration - Math.floor((now - start) / 1000));
}

export function formatMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function composeLetterWish(
  lead: string,
  value: string
): string {
  const trimmedLead = String(lead || '').trim();
  const trimmedValue = String(value || '').trim();
  if (!trimmedValue) return `${trimmedLead}…`;
  const endsWithPunctuation = /[.!?]$/.test(trimmedLead)
    || trimmedLead.endsWith('…')
    || trimmedLead.endsWith('—')
    || trimmedLead.endsWith('–')
    || trimmedLead.endsWith(',')
    || trimmedLead.endsWith('-');
  if (endsWithPunctuation) return `${trimmedLead} ${trimmedValue}`;
  return `${trimmedLead} ${trimmedValue}.`;
}

/** Draw the next unused item from a charades-style deck. */
export function nextUniqueDraw(pool: string[], used: string[] = []): {
  item: string | null;
  used: string[];
  drawnCount: number;
  total: number;
  remaining: number;
} {
  const uniquePool = [...new Set(pool.map((item) => String(item || '').trim()).filter(Boolean))];
  const usedSet = new Set(used);
  const leftover = uniquePool.filter((item) => !usedSet.has(item));
  const total = uniquePool.length;
  if (leftover.length === 0) {
    return {
      item: null,
      used: uniquePool.filter((item) => usedSet.has(item)),
      drawnCount: Math.min(usedSet.size, total),
      total,
      remaining: 0,
    };
  }
  const item = leftover[Math.floor(Math.random() * leftover.length)];
  const nextUsed = [...used.filter((entry) => uniquePool.includes(entry)), item];
  return {
    item,
    used: nextUsed,
    drawnCount: nextUsed.length,
    total,
    remaining: total - nextUsed.length,
  };
}

const RANDOMIZER_POOL_KEYS = ['prompts', 'missions', 'facts', 'characters'] as const;

export type RandomizerCopy = {
  hint: string;
  itemNoun: string;
  emptyLabel: string;
  startLabel: string;
  drawLabel: string;
  nextLabel: string;
  newRoundLabel: string;
  exhaustedLabel: string;
  timerLabel: string;
  timerDoneLabel: string;
  ctaLabel: string;
  guessedLabel: string;
  skipLabel: string;
  successTitle: string;
  successLabel: string;
  modeLabel: string;
};

export type RandomizerConfig = {
  pool: string[];
  sets: string[][];
  nameField: string;
  uniqueDraw: boolean;
  timerSeconds: number;
  successTarget: number;
  markGuessed: boolean;
  copy: RandomizerCopy;
};

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean))];
}

function readStringSets(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => readStringList(row))
    .filter((row) => row.length > 0);
}

export function encodeSetDraw(items: string[]): string {
  return items.map((item) => String(item || '').trim()).filter(Boolean).join('\n');
}

export function splitSetDraw(draw?: string | null): string[] {
  if (!draw) return [];
  return draw.split('\n').map((item) => item.trim()).filter(Boolean);
}

function readString(pack: Record<string, unknown> | null | undefined, key: string, fallback = ''): string {
  const value = pack?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readNumber(pack: Record<string, unknown> | null | undefined, key: string, fallback = 0): number {
  const value = Number(pack?.[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Universal RandomizerTimer config from a content pack.
 * New phrase/sound/gesture games should only need JSON: `prompts` plus optional copy fields.
 */
export function resolveRandomizerConfig(pack: Record<string, unknown> | null | undefined): RandomizerConfig {
  const sets = readStringSets(pack?.sets).length
    ? readStringSets(pack?.sets)
    : readStringSets(pack?.missionSets);
  let pool: string[] = sets.map((row) => encodeSetDraw(row));
  let poolKey = sets.length ? 'sets' : '';
  if (!pool.length) {
    for (const key of RANDOMIZER_POOL_KEYS) {
      const list = readStringList(pack?.[key]);
      if (list.length) {
        pool = list;
        poolKey = key;
        break;
      }
    }
  }

  const fromPrompts = poolKey === 'prompts';
  const fromFacts = poolKey === 'facts';
  const fromSets = poolKey === 'sets';
  const uniqueDraw =
    pack?.uniqueDraw === true || ((fromPrompts || fromFacts || fromSets) && pack?.uniqueDraw !== false);
  const successTarget = Math.floor(readNumber(pack, 'successTarget', 0));
  const markGuessed = pack?.markGuessed === true || successTarget > 0;
  const itemNoun = readString(
    pack,
    'itemNoun',
    fromPrompts ? 'Hasło' : fromFacts ? 'Ciekawostka' : fromSets ? 'Zestaw' : 'Zadanie'
  );
  const ctaFallback = fromFacts
    ? `Odkryj ${itemNoun.toLowerCase()}`
    : fromPrompts
      ? `Wylosuj ${itemNoun.toLowerCase()}`
      : fromSets
        ? 'Wylosuj misję'
        : 'Wylosuj zadanie';

  return {
    pool,
    sets,
    nameField: readString(pack, 'nameField'),
    uniqueDraw,
    timerSeconds: Math.floor(readNumber(pack, 'timerSeconds', 0)),
    successTarget,
    markGuessed,
    copy: {
      hint: readString(pack, 'promptHint'),
      itemNoun,
      emptyLabel: readString(pack, 'emptyLabel', ctaFallback),
      startLabel: readString(pack, 'startLabel', successTarget > 0 ? 'Start' : ''),
      drawLabel: readString(pack, 'drawLabel', 'Losuj'),
      nextLabel: readString(pack, 'nextLabel', `Następne ${itemNoun.toLowerCase()}`),
      newRoundLabel: readString(pack, 'newRoundLabel', successTarget > 0 ? 'Jeszcze raz' : 'Nowa runda'),
      exhaustedLabel: readString(
        pack,
        'exhaustedLabel',
        `To było ostatnie ${itemNoun.toLowerCase()} tej rundy`
      ),
      timerLabel: readString(pack, 'timerLabel', 'Czas na rundę'),
      timerDoneLabel: readString(pack, 'timerDoneLabel', 'Czas minął'),
      ctaLabel: readString(pack, 'ctaLabel', ctaFallback),
      guessedLabel: readString(pack, 'guessedLabel', 'Odgadnięte'),
      skipLabel: readString(pack, 'skipLabel', 'Pomiń'),
      successTitle: readString(pack, 'successTitle'),
      successLabel: readString(pack, 'successLabel'),
      modeLabel: readString(pack, 'modeLabel'),
    },
  };
}

export function formatRandomizerProgress(noun: string, n: number, total: number): string {
  const label = String(noun || 'Hasło').trim() || 'Hasło';
  return `${label} ${n} z ${total}`;
}

export function packCtaLabel(pack: Record<string, unknown> | null | undefined): string | null {
  const explicit = readString(pack, 'ctaLabel');
  if (explicit) return explicit;
  const config = resolveRandomizerConfig(pack);
  return config.pool.length ? config.copy.ctaLabel : null;
}

export type ImageCardSlot = {
  id: string;
  label: string;
};

export const IMAGE_CARD_FILE_ACCEPT =
  'image/jpeg,image/jpg,image/pjpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif';

export const IMAGE_CARD_FORMATS_HINT =
  'Wczytaj zdjęcie JPG, PNG, WEBP lub GIF (do 10 MB).';

export type ImageCardConfig = {
  slots: ImageCardSlot[];
  captionField: string;
  notes: string[];
  kicker: string;
  formatsHint: string;
  accept: string;
};

export function resolveImageCardConfig(pack: Record<string, unknown> | null | undefined): ImageCardConfig {
  const rawSlots = Array.isArray(pack?.slots) ? pack.slots : [];
  const slots = rawSlots.flatMap((slot, index) => {
    if (!slot || typeof slot !== 'object' || Array.isArray(slot)) return [];
    const row = slot as Record<string, unknown>;
    const id = String(row.id || `photo-${index + 1}`).trim();
    const label = String(row.label || `Zdjęcie ${index + 1}`).trim();
    return id ? [{ id, label: label || id }] : [];
  });
  return {
    slots: slots.length ? slots : [{ id: 'photo', label: 'Zdjęcie' }],
    captionField: readString(pack, 'captionField'),
    notes: readNotes(pack),
    kicker: readString(pack, 'kicker', 'Wtedy i dziś'),
    formatsHint: readString(pack, 'formatsHint', IMAGE_CARD_FORMATS_HINT),
    accept: readString(pack, 'accept', IMAGE_CARD_FILE_ACCEPT),
  };
}

export function photoSrc(
  photos: Record<string, unknown> | undefined,
  slotId: string
): string {
  const item = photos?.[slotId];
  if (typeof item === 'string') return item.trim();
  if (!item || typeof item !== 'object' || Array.isArray(item)) return '';
  const row = item as Record<string, unknown>;
  return String(row.url || row.dataUrl || '').trim();
}

export type ScoreHuntHouse = {
  name: string;
  points: number;
};

export type ScoreHuntLegendItem = {
  points: number;
  label: string;
};

export type ScoreHuntTitle = {
  min: number;
  title: string;
};

export type ScoreHuntConfig = {
  houseCount: number;
  houseNoun: string;
  nameField: string;
  pointsLabel: string;
  totalLabel: string;
  maxPoints: number;
  notes: string[];
  kicker: string;
  legend: ScoreHuntLegendItem[];
  titles: ScoreHuntTitle[];
};

export function emptyScoreHouses(count: number): ScoreHuntHouse[] {
  const n = Math.max(1, Math.floor(count) || 6);
  return Array.from({ length: n }, () => ({ name: '', points: 0 }));
}

export function readScoreHouses(
  payload: Record<string, unknown> | null | undefined,
  houseCount: number
): ScoreHuntHouse[] {
  const houses = emptyScoreHouses(houseCount);
  const raw = payload?.houses;
  if (!Array.isArray(raw)) return houses;
  return houses.map((house, index) => {
    const row = raw[index];
    if (!row || typeof row !== 'object' || Array.isArray(row)) return house;
    const entry = row as Record<string, unknown>;
    const points = Math.max(0, Math.floor(Number(entry.points) || 0));
    return {
      name: String(entry.name || '').trim(),
      points,
    };
  });
}

export function scoreHuntTotal(houses: ScoreHuntHouse[]): number {
  return houses.reduce((sum, house) => sum + Math.max(0, house.points || 0), 0);
}

export function scoreHuntTitle(titles: ScoreHuntTitle[], total: number): string {
  const sorted = [...titles].sort((a, b) => a.min - b.min);
  let title = sorted[0]?.title || '';
  for (const row of sorted) {
    if (total >= row.min) title = row.title;
  }
  return title;
}

export function resolveScoreHuntConfig(pack: Record<string, unknown> | null | undefined): ScoreHuntConfig {
  const rawLegend = Array.isArray(pack?.legend) ? pack.legend : [];
  const legend = rawLegend.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const points = Math.max(0, Math.floor(Number(row.points) || 0));
    const label = String(row.label || '').trim();
    return label ? [{ points, label }] : [];
  });
  const rawTitles = Array.isArray(pack?.titles) ? pack.titles : [];
  const titles = rawTitles.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const title = String(row.title || '').trim();
    const min = Math.max(0, Math.floor(Number(row.min) || 0));
    return title ? [{ min, title }] : [];
  });
  return {
    houseCount: Math.max(1, Math.floor(readNumber(pack, 'houseCount', 6))),
    houseNoun: readString(pack, 'houseNoun', 'Dom'),
    nameField: readString(pack, 'nameField', 'Dom albo ulica'),
    pointsLabel: readString(pack, 'pointsLabel', 'Punkty'),
    totalLabel: readString(pack, 'totalLabel', 'Suma'),
    maxPoints: Math.max(1, Math.floor(readNumber(pack, 'maxPoints', 6))),
    notes: readNotes(pack),
    kicker: readString(pack, 'kicker', 'Łowca światełek'),
    legend: legend.length
      ? legend
      : [
          { points: 1, label: 'Lampki' },
          { points: 2, label: 'Renifer' },
          { points: 3, label: 'Efektowny dom lub witryna' },
        ],
    titles: titles.length
      ? titles
      : [
          { min: 0, title: 'Początek tropu' },
          { min: 6, title: 'Łowca światełek' },
          { min: 12, title: 'Mistrz iluminacji' },
        ],
  };
}

export type CardFormConfig = {
  fields: string[];
  fieldsOptional: boolean;
  notes: string[];
  nameField: string;
  allowMultipleCards: boolean;
  entryLayout: 'stack' | 'roster';
  clearOnPrint: boolean;
  addCardLabel: string;
  removeCardLabel: string;
  maxCards: number;
  cardNoun: string;
  optionalLabel: string;
  letterGreeting: string;
  letterIntro: string;
  letterOutro: string;
  letterLeads: string[];
};

export type FormCardEntry = {
  name: string;
  fields: Record<string, string>;
};

function numberedFieldLabels(noun: string, count: number): string[] {
  const n = Math.max(1, Math.floor(count) || 1);
  const label = noun.trim() || 'Pole';
  if (n === 1) return [label];
  return Array.from({ length: n }, (_, i) => `${label} ${i + 1}`);
}

function readNotes(pack: Record<string, unknown> | null | undefined): string[] {
  const notes = readStringList(pack?.notes);
  if (notes.length) return notes;
  const hint = readString(pack, 'formHint');
  return hint ? [hint] : [];
}

export function resolveCardFormConfig(pack: Record<string, unknown> | null | undefined): CardFormConfig {
  const explicit = readStringList(pack?.fields).length
    ? readStringList(pack?.fields)
    : readStringList(pack?.prompts);
  const fieldNoun = readString(pack, 'fieldNoun', 'Pole');
  const fieldCount = Math.floor(readNumber(pack, 'fieldCount', explicit.length || 3));
  const maxCards = Math.max(1, Math.floor(readNumber(pack, 'maxCards', 6)));
  const cardNoun = readString(pack, 'cardNoun', 'Karta');
  const fields = explicit.length ? explicit : numberedFieldLabels(fieldNoun, fieldCount);
  const nameField = readString(pack, 'nameField');
  const allowMultipleCards = pack?.allowMultipleCards === true;
  const explicitLayout = readString(pack, 'entryLayout');
  const entryLayout =
    explicitLayout === 'roster' || explicitLayout === 'stack'
      ? explicitLayout
      : allowMultipleCards && nameField && fields.length <= 1
        ? 'roster'
        : 'stack';

  return {
    fields,
    fieldsOptional: pack?.fieldsOptional === true,
    notes: readNotes(pack),
    nameField,
    allowMultipleCards,
    entryLayout,
    clearOnPrint: pack?.clearOnPrint === true,
    addCardLabel: readString(pack, 'addCardLabel', `Dodaj ${cardNoun.toLowerCase()}`),
    removeCardLabel: readString(pack, 'removeCardLabel', `Usuń ${cardNoun.toLowerCase()}`),
    maxCards,
    cardNoun,
    optionalLabel: readString(pack, 'optionalLabel', 'opcjonalne'),
    letterGreeting: readString(pack, 'letterGreeting'),
    letterIntro: readString(pack, 'letterIntro'),
    letterOutro: readString(pack, 'letterOutro'),
    letterLeads: Array.isArray(pack?.letterLeads)
      ? pack.letterLeads.map((item) => String(item ?? '').trim())
      : [],
  };
}

export function emptyFormCard(fieldLabels: string[], name = ''): FormCardEntry {
  return {
    name,
    fields: Object.fromEntries(fieldLabels.map((label) => [label, ''])),
  };
}

export function readFormCards(
  payload: Record<string, unknown> | undefined,
  config: CardFormConfig
): FormCardEntry[] {
  const rawCards = Array.isArray(payload?.cards) ? payload.cards : [];
  const parsed = rawCards.flatMap((card) => {
    if (!card || typeof card !== 'object' || Array.isArray(card)) return [];
    const row = card as Record<string, unknown>;
    const rawFields =
      row.fields && typeof row.fields === 'object' && !Array.isArray(row.fields)
        ? (row.fields as Record<string, unknown>)
        : {};
    return [
      {
        name: String(row.name ?? ''),
        fields: Object.fromEntries(config.fields.map((label) => [label, String(rawFields[label] ?? '')])),
      },
    ];
  });
  if (parsed.length) return parsed.slice(0, config.maxCards);

  const fields =
    payload?.fields && typeof payload.fields === 'object' && !Array.isArray(payload.fields)
      ? (payload.fields as Record<string, unknown>)
      : {};
  return [
    {
      name: String(payload?.name ?? ''),
      fields: Object.fromEntries(config.fields.map((label) => [label, String(fields[label] ?? '')])),
    },
  ];
}

export function clearedFormProgress(config: CardFormConfig): Record<string, unknown> {
  const blank = emptyFormCard(config.fields);
  return {
    name: '',
    fields: blank.fields,
    cards: [],
    started: true,
  };
}

export type QuizQuestion = {
  id?: string;
  text: string;
  options: string[];
  correctIndex: number;
  fact: string;
};

export type QuizConfig = {
  questions: QuizQuestion[];
  questionsPerSession: number;
  replayLabel: string;
  resultLabel: string;
};

function readQuizQuestions(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const text = String(row.text ?? '').trim();
    const options = Array.isArray(row.options)
      ? row.options.map((option) => String(option ?? '').trim()).filter(Boolean)
      : [];
    if (!text || options.length < 2) return [];
    const correctIndex = Number(row.correctIndex);
    return [
      {
        id: row.id ? String(row.id) : undefined,
        text,
        options,
        correctIndex: Number.isInteger(correctIndex) ? correctIndex : 0,
        fact: String(row.fact ?? ''),
      },
    ];
  });
}

export function resolveQuizConfig(pack: Record<string, unknown> | null | undefined): QuizConfig {
  const questions = readQuizQuestions(pack?.questions);
  const perSession = Math.floor(readNumber(pack, 'questionsPerSession', questions.length || 7));
  return {
    questions,
    questionsPerSession: Math.min(Math.max(1, perSession), questions.length || perSession),
    replayLabel: readString(pack, 'replayLabel', 'Jeszcze raz'),
    resultLabel: readString(pack, 'resultLabel', 'Wynik'),
  };
}

export function pickQuizSession(
  questions: QuizQuestion[],
  count: number,
  seed: string
): QuizQuestion[] {
  const size = Math.min(Math.max(1, Math.floor(count) || 1), questions.length);
  return seededShuffle(questions, seed).slice(0, size);
}

export function readQuizSession(value: unknown, fallback: QuizQuestion[]): QuizQuestion[] {
  const parsed = readQuizQuestions(value);
  return parsed.length ? parsed : fallback;
}

export function formatQuizResult(resultLabel: string, score: number, total: number): string {
  const label = String(resultLabel || 'Wynik').trim() || 'Wynik';
  return `${label}: ${score}/${total}`;
}

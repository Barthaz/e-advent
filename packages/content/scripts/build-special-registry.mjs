#!/usr/bin/env node
/**
 * Builds special-config-registry.json from catalog + engine matrix (README §24).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const catalog = JSON.parse(
  readFileSync(join(root, 'catalog', 'e-advent-calendars-data.json'), 'utf8'),
);

/** README §24 — taskId → engine spec */
const ENGINE_MATRIX = {
  'set-1-task-5': { engine: 'QUIZ', contentKey: 'christmas-quiz-v1', noPrint: true },
  'set-1-task-6': { engine: 'CARD_FORM', contentKey: 'adult-santa-letter-v1', templateId: 'santa-adult-letter-v1' },
  'set-1-task-7': { engine: 'CHECKLIST', variant: 'BINGO', contentKey: 'christmas-bingo-v1', templateId: 'bingo-v1' },
  'set-1-task-9': { engine: 'DOCUMENT', templateId: 'paper-village-v1', contentKey: 'paper-village-v1' },
  'set-1-task-10': { engine: 'RANDOMIZER_TIMER', contentKey: 'christmas-theatre-v1', noPrint: true },
  'set-1-task-11': { engine: 'RANDOMIZER_TIMER', variant: 'DECK', contentKey: 'christmas-trivia-v1', noPrint: true },
  'set-1-task-15': { engine: 'CHECKLIST', variant: 'SCORE', contentKey: 'illumination-hunt-v1', templateId: 'score-summary-v1' },
  'set-1-task-17': { engine: 'IMAGE_CARD', contentKey: 'photo-then-now-v1', templateId: 'then-now-v1' },
  'set-1-task-19': { engine: 'TURN_BASED_GAME', contentKey: 'christmas-alphabet-v1', noPrint: true },
  'set-1-task-21': { engine: 'RANDOMIZER_TIMER', contentKey: 'secret-elf-missions-v1' },
  'set-1-task-22': { engine: 'RANDOMIZER_TIMER', contentKey: 'christmas-charades-v1' },
  'set-1-task-23': { engine: 'CARD_FORM', contentKey: 'gift-detective-v1', templateId: 'detective-report-v1' },
  'set-1-task-24': { engine: 'SORTABLE_LIST', contentKey: 'december-ranking-v1', templateId: 'ranking-v1' },
  'set-1-task-28': { engine: 'CARD_FORM', dateGate: true, contentKey: 'christmas-prediction-v1', templateId: 'prediction-v1' },
  'set-1-task-29': { engine: 'RANDOMIZER_TIMER', contentKey: 'reindeer-challenge-v1' },
  'set-2-task-1': { engine: 'CHECKLIST', secondaryEngine: 'DOCUMENT', contentKey: 'packing-station-v1', templateId: 'checklist-v1' },
  'set-2-task-4': { engine: 'CHECKLIST', contentKey: 'emergency-box-v1', templateId: 'checklist-v1' },
  'set-2-task-5': { engine: 'PLANNER', contentKey: 'gift-planner-v1', templateId: 'gift-planner-v1' },
  'set-2-task-6': { engine: 'CHECKLIST', contentKey: 'pantry-checklist-v1', templateId: 'checklist-v1' },
  'set-2-task-9': { engine: 'CHECKLIST', contentKey: 'wrapping-inventory-v1', templateId: 'inventory-v1' },
  'set-2-task-18': { engine: 'TEMPLATE_PERSONALIZER', secondaryEngine: 'DOCUMENT', contentKey: 'labels-personalizer-v1', templateId: 'labels-sheet-v1' },
  'set-2-task-19': { engine: 'MONTH_PLANNER', contentKey: 'december-planner-v1', templateId: 'month-planner-v1' },
  'set-2-task-20': { engine: 'PLANNER', contentKey: 'christmas-menu-v1', templateId: 'planner-v1' },
  'set-2-task-24': { engine: 'OPTION_CONFIGURATOR', contentKey: 'emergency-gift-ideas-v1', templateId: 'suggestion-list-v1' },
  'set-2-task-30': { engine: 'CHECKLIST', variant: 'AUDIT', contentKey: 'final-audit-v1', templateId: 'audit-v1' },
  'set-3-task-1': { engine: 'RANDOMIZER_TIMER', contentKey: 'secret-elf-kindness-missions-v1' },
  'set-3-task-2': { engine: 'CARD_FORM', contentKey: 'thank-you-card-prompts-v1', templateId: 'form-card-v1' },
  'set-3-task-7': { engine: 'TEMPLATE_PERSONALIZER', secondaryEngine: 'DOCUMENT', contentKey: 'greeting-card-fields-v1', templateId: 'greeting-card-v1' },
  'set-3-task-9': { engine: 'TEMPLATE_PERSONALIZER', contentKey: 'gift-label-fields-v1', templateId: 'labels-sheet-v1' },
  'set-3-task-13': { engine: 'CARD_FORM', contentKey: 'pay-it-forward-v1', templateId: 'form-card-v1' },
  'set-3-task-19': { engine: 'CHECKLIST', variant: 'STEPS', contentKey: 'three-smiles-v1', templateId: 'steps-summary-v1' },
  'set-3-task-24': { engine: 'RANDOMIZER_TIMER', variant: 'PROMPT_DECK', secondaryEngine: 'DOCUMENT', contentKey: 'family-memory-prompts-v1', templateId: 'prompt-sheet-v1' },
  'set-3-task-27': { engine: 'CARD_FORM', contentKey: 'personal-wishes-prompts-v1', templateId: 'greeting-card-v1' },
  'set-4-task-2': { engine: 'DOCUMENT', contentKey: 'wrapping-pattern-v1', templateId: 'wrapping-pattern-v1' },
  'set-4-task-3': { engine: 'TEMPLATE_PERSONALIZER', secondaryEngine: 'DOCUMENT', contentKey: 'labels-personalizer-v1', templateId: 'labels-sheet-v1' },
  'set-4-task-4': { engine: 'TEMPLATE_PERSONALIZER', contentKey: 'postcard-personalizer-v1', templateId: 'postcard-v1' },
  'set-4-task-5': { engine: 'DOCUMENT', contentKey: 'paper-village-v1', templateId: 'paper-village-v1' },
  'set-4-task-6': { engine: 'DOCUMENT', contentKey: 'salt-dough-guide-v1', templateId: 'salt-dough-guide-v1' },
  'set-4-task-7': { engine: 'DOCUMENT', contentKey: 'stamp-guide-v1', templateId: 'stamp-guide-v1' },
  'set-4-task-10': { engine: 'DOCUMENT', contentKey: 'envelope-decor-guide-v1', templateId: 'envelope-decor-guide-v1' },
  'set-4-task-11': { engine: 'DOCUMENT', contentKey: 'bookmarks-v1', templateId: 'bookmarks-v1' },
  'set-4-task-13': { engine: 'DOCUMENT', contentKey: 'paper-reindeer-v1', templateId: 'paper-reindeer-v1' },
  'set-4-task-16': { engine: 'DOCUMENT', contentKey: 'origami-guide-v1', templateId: 'origami-guide-v1' },
  'set-4-task-17': { engine: 'IMAGE_CARD', contentKey: 'photo-frame-v1' },
  'set-4-task-20': { engine: 'TEMPLATE_PERSONALIZER', secondaryEngine: 'DOCUMENT', contentKey: 'comic-sheet-v1', templateId: 'comic-sheet-v1' },
  'set-4-task-21': { engine: 'DOCUMENT', contentKey: 'memory-chain-v1', templateId: 'memory-chain-v1' },
  'set-4-task-25': { engine: 'DOCUMENT', contentKey: 'garland-v1', templateId: 'garland-v1' },
  'set-4-task-28': { engine: 'TEMPLATE_PERSONALIZER', contentKey: 'coupon-sheet-v1', templateId: 'coupon-sheet-v1' },
  'set-5-task-2': { engine: 'SCORECARD', contentKey: 'chocolate-tasting-v1', templateId: 'scorecard-v1' },
  'set-5-task-4': { engine: 'RECIPE', contentKey: 'recipe-truffles-v1', templateId: 'recipe-v1' },
  'set-5-task-5': { engine: 'IMAGE_CARD', secondaryEngine: 'SCORECARD', contentKey: 'gingerbread-test-v1' },
  'set-5-task-6': { engine: 'OPTION_CONFIGURATOR', contentKey: 'christmas-board-builder-v1', templateId: 'configured-card-v1' },
  'set-5-task-8': { engine: 'RECIPE', contentKey: 'recipe-cinnamon-rolls-v1', templateId: 'recipe-v1' },
  'set-5-task-9': { engine: 'OPTION_CONFIGURATOR', secondaryEngine: 'RECIPE', contentKey: 'hot-chocolate-builder-v1', templateId: 'recipe-v1' },
  'set-5-task-15': { engine: 'RECIPE', contentKey: 'recipe-caramelized-nuts-v1', templateId: 'recipe-v1' },
  'set-5-task-17': { engine: 'OPTION_CONFIGURATOR', contentKey: 'mocktail-builder-v1', templateId: 'configured-recipe-v1' },
  'set-5-task-20': { engine: 'SCORECARD', contentKey: 'tea-tasting-v1', templateId: 'scorecard-v1' },
  'set-5-task-22': { engine: 'RECIPE', secondaryEngine: 'TEMPLATE_PERSONALIZER', contentKey: 'edible-gift-v1', templateId: 'recipe-gift-label-v1' },
  'set-5-task-24': { engine: 'SCORECARD', contentKey: 'cookie-duel-v1', templateId: 'scorecard-v1' },
  'set-5-task-27': { engine: 'RECIPE', secondaryEngine: 'CARD_FORM', contentKey: 'family-recipe-v1', templateId: 'family-recipe-v1' },
  'set-6-task-1': { engine: 'CARD_FORM', dateGate: true, contentKey: 'future-self-letter-v1', templateId: 'private-letter-v1' },
  'set-6-task-2': { engine: 'CARD_FORM', contentKey: 'three-good-scenes-v1', templateId: 'memory-card-v1' },
  'set-6-task-3': { engine: 'CARD_FORM', contentKey: 'year-in-six-words-v1', templateId: 'typographic-card-v1' },
  'set-6-task-4': { engine: 'IMAGE_CARD', contentKey: 'photo-frame-v1' },
  'set-6-task-5': { engine: 'CHECKLIST', contentKey: 'five-senses-walk-v1', templateId: 'checklist-summary-v1' },
  'set-6-task-8': { engine: 'CARD_FORM', contentKey: 'good-people-v1', templateId: 'gratitude-card-v1' },
  'set-6-task-10': { engine: 'RANDOMIZER_TIMER', variant: 'TIMER_ONLY', contentKey: 'no-notifications-hour-v1' },
  'set-6-task-11': { engine: 'CARD_FORM', contentKey: 'ten-small-joys-v1', templateId: 'memory-list-v1' },
  'set-6-task-14': { engine: 'CARD_FORM', contentKey: 'christmas-intention-v1', exportPng: true },
  'set-6-task-18': { engine: 'CARD_FORM', contentKey: 'our-tradition-v1', templateId: 'tradition-card-v1' },
  'set-6-task-23': { engine: 'CARD_FORM', dateGate: 'optional', contentKey: 'time-capsule-v1', templateId: 'time-capsule-v1' },
  'set-6-task-30': { engine: 'CARD_FORM', contentKey: 'december-closure-v1', templateId: 'closure-card-v1' },
};

/** Nominative overlay/PDF titles — catalog `title` stays genitive for „Dzień …” copy. */
const HEADLINES = {
  'set-1-task-5': 'Quiz wiedzy o Bożym Narodzeniu',
  'set-1-task-6': 'List do Mikołaja dla dorosłych',
  'set-1-task-7': 'Świąteczne bingo na grudniowy spacer',
  'set-1-task-9': 'Miniaturowa świąteczna wioska',
  'set-1-task-10': 'Świąteczny teatrzyk',
  'set-1-task-11': 'Świąteczna ciekawostka dnia',
  'set-1-task-15': 'Polowanie na iluminacje',
  'set-1-task-17': 'Fotograficzny powrót — wtedy i dziś',
  'set-1-task-19': 'Świąteczny alfabet',
  'set-1-task-21': 'Tajna misja elfa',
  'set-1-task-22': 'Świąteczne kalambury',
  'set-1-task-23': 'Raport Prezentowego Detektywa',
  'set-1-task-24': 'Grudniowy ranking filmów świątecznych',
  'set-1-task-28': 'Świąteczna przepowiednia na Wigilię',
  'set-1-task-29': 'Reniferowe wyzwanie bez słów',
  'set-2-task-1': 'Checklista świątecznej stacji pakowania',
  'set-2-task-4': 'Lista pudełka awaryjnego',
  'set-2-task-5': 'Planer prezentów bez paniki',
  'set-2-task-6': 'Checklista świątecznej spiżarni',
  'set-2-task-9': 'Inwentaryzacja papieru i wstążek',
  'set-2-task-18': 'Etykiety prezentowe do druku',
  'set-2-task-19': 'Kalendarz grudniowych terminów',
  'set-2-task-20': 'Planer świątecznego menu',
  'set-2-task-24': 'Awaryjna lista uniwersalnych prezentów',
  'set-2-task-30': 'Ostatnia kontrola przed Wigilią',
  'set-3-task-1': 'Misja Tajemniczego Elfa',
  'set-3-task-2': 'Karta prawdziwego „dziękuję”',
  'set-3-task-7': 'Osobista kartka świąteczna',
  'set-3-task-9': 'Etykietka do małej paczuszki',
  'set-3-task-13': 'Łańcuch dobra',
  'set-3-task-19': 'Trzy uśmiechy na dziś',
  'set-3-task-24': 'Karta rodzinnych wspomnień',
  'set-3-task-27': 'Życzenia napisane własnymi słowami',
  'set-4-task-2': 'Wzory na własny papier prezentowy',
  'set-4-task-3': 'Eleganckie etykiety prezentowe',
  'set-4-task-4': 'Świąteczna pocztówka z Twojego miejsca',
  'set-4-task-5': 'Szablon papierowej wioski',
  'set-4-task-6': 'Zawieszki z masy solnej',
  'set-4-task-7': 'Wzory świątecznych stempli',
  'set-4-task-10': 'Ozdobna koperta',
  'set-4-task-11': 'Świąteczna zakładka do książki',
  'set-4-task-13': 'Papierowy renifer',
  'set-4-task-16': 'Świąteczne origami',
  'set-4-task-17': 'Świąteczna ramka na zdjęcie',
  'set-4-task-20': 'Świąteczny komiks w czterech kadrach',
  'set-4-task-21': 'Łańcuch wspomnień',
  'set-4-task-25': 'Mała girlanda do druku',
  'set-4-task-28': 'Kupony-prezent z papieru',
  'set-5-task-2': 'Karta czekoladowej degustacji',
  'set-5-task-4': 'Przepis na trufle bez pieczenia',
  'set-5-task-5': 'Piernikowy test dekoracji',
  'set-5-task-6': 'Konfigurator świątecznej deski',
  'set-5-task-8': 'Przepis na cynamonowe ślimaczki',
  'set-5-task-9': 'Gorąca czekolada na bogato',
  'set-5-task-15': 'Przepis na karmelizowane orzechy',
  'set-5-task-17': 'Świąteczny koktajl bezalkoholowy',
  'set-5-task-20': 'Karta degustacji herbat',
  'set-5-task-22': 'Jadalny prezent — przepis i etykieta',
  'set-5-task-24': 'Ciasteczkowy pojedynek',
  'set-5-task-27': 'Rodzinny przepis — kuchenna pamiątka',
  'set-6-task-1': 'List do przyszłego siebie',
  'set-6-task-2': 'Trzy dobre sceny tego roku',
  'set-6-task-3': 'Rok w sześciu słowach',
  'set-6-task-4': 'Zdjęcie roku',
  'set-6-task-5': 'Zimowy spacer pięciu zmysłów',
  'set-6-task-8': 'Karta wdzięczności dla dobrych ludzi',
  'set-6-task-10': 'Godzina bez powiadomień',
  'set-6-task-11': 'Dziesięć małych radości grudnia',
  'set-6-task-14': 'Świąteczna intencja',
  'set-6-task-18': 'Nasza świąteczna tradycja',
  'set-6-task-23': 'Mała kapsuła czasu',
  'set-6-task-30': 'Grudniowe domknięcie roku',
};

/** Live games and one-off draws are played on screen — no PDF souvenir. */
function canPrint(matrixEntry) {
  if (!matrixEntry?.templateId || matrixEntry.noPrint) return false;
  if (matrixEntry.engine === 'QUIZ' || matrixEntry.engine === 'TURN_BASED_GAME') return false;
  return true;
}

const MOBILE_PRINTABLE_TEMPLATES = new Set([
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

function canPrintMobile(matrixEntry) {
  if (!canPrint(matrixEntry)) return false;
  return MOBILE_PRINTABLE_TEMPLATES.has(matrixEntry.templateId);
}

function buildDescriptor(taskId, task, matrixEntry) {
  const configId = `${taskId}-v1`;
  const headline = HEADLINES[taskId] || task.special?.addon || task.title;
  const descriptor = {
    configId,
    engine: matrixEntry.engine,
    version: 1,
    headline,
    description: task.special?.addon || undefined,
    contentKey: matrixEntry.contentKey,
    variant: matrixEntry.variant,
    completionRule: { type: 'MANUAL_OR_ENGINE_DEFAULT' },
    capabilities: {
      canShareImage: ['IMAGE_CARD', 'QUIZ', 'SORTABLE_LIST', 'CARD_FORM'].includes(matrixEntry.engine) || matrixEntry.exportPng,
      canPrint: canPrint(matrixEntry),
      canPrintMobile: canPrintMobile(matrixEntry),
      dateGate: matrixEntry.dateGate === true || matrixEntry.dateGate === 'optional',
    },
    config: {},
  };

  if (matrixEntry.secondaryEngine) {
    descriptor.config.secondaryEngine = matrixEntry.secondaryEngine;
  }

  if (canPrint(matrixEntry) && matrixEntry.templateId) {
    descriptor.document = {
      templateId: matrixEntry.templateId,
      version: 1,
      variants: ['COLOR', 'INK_SAVER'],
      defaultPage: 'A5',
    };
  }

  return descriptor;
}

const registry = { version: 1, entries: {} };

for (const set of catalog.sets) {
  for (const task of set.tasks) {
    if (!task.isSpecial) continue;
    const matrixEntry = ENGINE_MATRIX[task.id];
    if (!matrixEntry) {
      console.warn(`⚠ Missing engine matrix for ${task.id}`);
      continue;
    }
    if (!HEADLINES[task.id]) {
      console.warn(`⚠ Missing headline for ${task.id}`);
    }
    registry.entries[task.id] = buildDescriptor(task.id, task, matrixEntry);
  }
}

const generatedDir = join(root, 'generated');
mkdirSync(generatedDir, { recursive: true });
writeFileSync(join(generatedDir, 'special-config-registry.json'), JSON.stringify(registry, null, 2));
console.log(`✓ special-config-registry.json (${Object.keys(registry.entries).length} specials)`);

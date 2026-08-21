#!/usr/bin/env node
/**
 * Builds creator examples.json (order 1–24 per set) and creator-index.json (text → catalogTaskId).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const catalogPath = join(root, 'catalog', 'e-advent-calendars-data.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));

const SET_DESCRIPTIONS = {
  'Świąteczny nastrój i zabawa': 'Zadania, które wprowadzą Cię w klimat świąt i poprawią humor.',
  'Porządki i przygotowania': 'Zadania pomagające uporządkować dom i przygotować się do świąt.',
  'Dobre uczynki i życzliwość': 'Zadania, które pomagają szerzyć dobro i pozytywną energię.',
  'Kreatywne i artystyczne': 'Zadania rozwijające kreatywność i artystyczną stronę świąt.',
  'Kuchenne i kulinarne': 'Zadania kuchenne i kulinarne na świąteczny czas.',
  'Refleksja i relaks': 'Zadania na spokojne chwile refleksji i relaksu w grudniu.',
};

function normalizeText(text) {
  return text.trim().toLowerCase();
}

const examples = [];
const creatorIndex = {
  version: 1,
  sets: [],
  textToCatalogTaskId: {},
  catalogTaskById: {},
};

for (const set of catalog.sets) {
  const dayTasks = set.tasks
    .filter((t) => t.order >= 1 && t.order <= 24)
    .sort((a, b) => a.order - b.order);

  const setEntry = {
    setNumber: set.setNumber,
    title: set.title,
    description: SET_DESCRIPTIONS[set.title] || '',
    tasks: dayTasks.map((t) => ({
      order: t.order,
      text: t.text,
      catalogTaskId: t.id,
      isSpecial: !!t.isSpecial,
    })),
  };

  creatorIndex.sets.push(setEntry);

  const exampleTasks = dayTasks.map((t) => t.text);
  examples.push({
    title: set.title,
    description: SET_DESCRIPTIONS[set.title] || '',
    tasks: exampleTasks,
  });

  for (const t of dayTasks) {
    creatorIndex.textToCatalogTaskId[normalizeText(t.text)] = t.id;
    creatorIndex.catalogTaskById[t.id] = {
      setNumber: set.setNumber,
      setTitle: set.title,
      order: t.order,
      title: t.title,
      text: t.text,
      isSpecial: !!t.isSpecial,
    };
  }
}

const generatedDir = join(root, 'generated');
mkdirSync(generatedDir, { recursive: true });

writeFileSync(join(generatedDir, 'creator-index.json'), JSON.stringify(creatorIndex, null, 2));

const frontendExamplesPath = join(root, '..', '..', 'apps', 'e-advent-frontend', 'src', 'data', 'examples.json');
const frontendIndexPath = join(root, '..', '..', 'apps', 'e-advent-frontend', 'src', 'data', 'creator-index.json');
writeFileSync(frontendExamplesPath, JSON.stringify(examples, null, 4));
writeFileSync(frontendIndexPath, JSON.stringify(creatorIndex, null, 2));

console.log(`✓ creator-index.json (${Object.keys(creatorIndex.catalogTaskById).length} tasks)`);
console.log(`✓ examples.json (${examples.length} sets, 24 tasks each)`);

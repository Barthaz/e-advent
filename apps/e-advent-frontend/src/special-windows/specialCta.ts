import { packCtaLabel, printableHint } from '@e-advent/special-core';
import type { SpecialEngineType, SpecialWindowDescriptor } from '@e-advent/types';
import { resolvePack } from './contentPacks';

export function specialCtaLabel(descriptor: SpecialWindowDescriptor): string {
  const engine = descriptor.engine;
  const variant = (descriptor.variant || '').toUpperCase();

  if (engine === 'CHECKLIST' && variant === 'BINGO') return 'Zagraj w bingo';
  if (engine === 'RANDOMIZER_TIMER' && variant === 'TIMER_ONLY') return 'Uruchom timer';
  const fromPack = packCtaLabel(
    resolvePack(descriptor.contentKey, descriptor.document?.templateId)
  );
  if (fromPack) return fromPack;
  if (engine === 'RANDOMIZER_TIMER' && variant === 'DECK') return 'Odkryj kartę';

  const labels: Record<SpecialEngineType, string> = {
    QUIZ: 'Rozpocznij quiz',
    CHECKLIST: 'Otwórz listę',
    RANDOMIZER_TIMER: 'Wylosuj zadanie',
    CARD_FORM: 'Wypełnij kartę',
    DOCUMENT: 'Otwórz szablon',
    RECIPE: 'Otwórz przepis',
    SCORECARD: 'Oceń próbki',
    IMAGE_CARD: 'Stwórz kartę',
    SORTABLE_LIST: 'Ułóż ranking',
    PLANNER: 'Otwórz planer',
    MONTH_PLANNER: 'Otwórz kalendarz',
    OPTION_CONFIGURATOR: 'Skonfiguruj',
    TURN_BASED_GAME: 'Zagraj',
    TEMPLATE_PERSONALIZER: 'Spersonalizuj',
  };

  return labels[engine] || 'Rozpocznij';
}

export function specialResumeLabel(descriptor: SpecialWindowDescriptor): string {
  return descriptor.engine === 'DOCUMENT' ? 'Zobacz szablon' : 'Rozpocznij';
}

export function isPrintableSpecial(descriptor: SpecialWindowDescriptor): boolean {
  return !!descriptor.capabilities?.canPrint && !!descriptor.document;
}

export function specialPrintableHint(descriptor: SpecialWindowDescriptor): string | null {
  if (!isPrintableSpecial(descriptor)) return null;
  return printableHint(descriptor);
}

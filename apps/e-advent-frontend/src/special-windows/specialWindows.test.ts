import { describe, expect, it } from 'vitest';
import { resolveAmbientVariant } from '@e-advent/design-tokens';
import {
  canCompleteEngine,
  bingoBoardStatus,
  remainingTimerSeconds,
  formatMmSs,
  isMobilePrintable,
  nextUniqueDraw,
  resolveRandomizerConfig,
  formatRandomizerProgress,
  packCtaLabel,
  resolveCardFormConfig,
  readFormCards,
  clearedFormProgress,
  splitSetDraw,
  resolveQuizConfig,
  pickQuizSession,
  formatQuizResult,
  resolveImageCardConfig,
  photoSrc,
  resolveScoreHuntConfig,
  readScoreHouses,
  scoreHuntTotal,
  scoreHuntTitle,
  resolveOptionConfiguratorConfig,
  formatOptionSelections,
  resolveTemplatePersonalizerConfig,
  resolveTurnBasedGameConfig,
  nextTurnLetter,
} from '@e-advent/special-core';
import type { SpecialWindowDescriptor } from '@e-advent/types';
import { specialCtaLabel, specialPrintableHint } from './specialCta';
import { resolvePack } from './contentPacks';

function descriptor(
  partial: Pick<SpecialWindowDescriptor, 'engine'> & Partial<SpecialWindowDescriptor>
): SpecialWindowDescriptor {
  return {
    configId: 'test-v1',
    version: 1,
    headline: 'Test',
    completionRule: { type: 'MANUAL' },
    config: {},
    ...partial,
  };
}

describe('resolveAmbientVariant', () => {
  it('returns LANDSCAPE for wide containers', () => {
    expect(resolveAmbientVariant(1920, 1080)).toBe('LANDSCAPE');
  });

  it('returns PORTRAIT for tall containers', () => {
    expect(resolveAmbientVariant(390, 844)).toBe('PORTRAIT');
  });

  it('returns SQUARE as fallback without dimensions', () => {
    expect(resolveAmbientVariant(0, 0)).toBe('SQUARE');
  });
});

describe('canCompleteEngine', () => {
  it('allows manual completion', () => {
    expect(
      canCompleteEngine({
        engine: 'DOCUMENT',
        completionRule: { type: 'MANUAL' },
        payload: { manualComplete: true },
      }).canComplete
    ).toBe(true);
  });

  it('completes the photo card after two slots are filled', () => {
    expect(
      canCompleteEngine({
        engine: 'IMAGE_CARD',
        completionRule: { type: 'DEFAULT' },
        payload: {
          photos: {
            then: { url: 'https://cdn.example/then.jpg' },
            now: { dataUrl: 'data:image/jpeg;base64,xx' },
          },
        },
      }).canComplete
    ).toBe(true);
  });

  it('completes the illumination hunt after one house gets points', () => {
    expect(
      canCompleteEngine({
        engine: 'CHECKLIST',
        completionRule: { type: 'DEFAULT' },
        payload: {
          houses: [
            { name: 'żółty dom', points: 3 },
            { name: '', points: 0 },
          ],
        },
      }).canComplete
    ).toBe(true);
  });
});

describe('specialPrintableHint', () => {
  it('is silent when the window has no PDF', () => {
    expect(
      specialPrintableHint(
        descriptor({ engine: 'QUIZ', capabilities: { canPrint: false } })
      )
    ).toBeNull();
  });

  it('invites a paper souvenir for web-only games', () => {
    const hint = specialPrintableHint(
      descriptor({
        engine: 'CARD_FORM',
        capabilities: { canPrint: true, canPrintMobile: false },
        document: { templateId: 'card-v1', version: 1 },
      })
    );
    expect(hint).toMatch(/przeżyć to zadanie tutaj/i);
    expect(hint).toMatch(/pobrać kartę/i);
  });

  it('speaks of a game card for bingo', () => {
    const hint = specialPrintableHint(
      descriptor({
        engine: 'CHECKLIST',
        variant: 'BINGO',
        capabilities: { canPrint: true, canPrintMobile: false },
        document: { templateId: 'bingo-v1', version: 1 },
      })
    );
    expect(hint).toMatch(/kartę do gry/i);
    expect(hint).not.toMatch(/uzupełnij/i);
  });

  it('asks to fill in and download a ready card for lists', () => {
    const hint = specialPrintableHint(
      descriptor({
        engine: 'CHECKLIST',
        capabilities: { canPrint: true, canPrintMobile: true },
        document: { templateId: 'checklist-v1', version: 1 },
      })
    );
    expect(hint).toBe('Uzupełnij listę tutaj i pobierz gotową kartę.');
  });

  it('asks to fill in and download the adult Santa letter', () => {
    const hint = specialPrintableHint(
      descriptor({
        engine: 'CARD_FORM',
        contentKey: 'adult-santa-letter-v1',
        capabilities: { canPrint: true, canPrintMobile: true },
        document: { templateId: 'santa-adult-letter-v1', version: 1 },
      })
    );
    expect(hint).toBe('Uzupełnij list tutaj i pobierz gotową kartkę.');
  });

  it('tells people to download the prediction PDF and pass the device on', () => {
    const hint = specialPrintableHint(
      descriptor({
        engine: 'CARD_FORM',
        contentKey: 'christmas-prediction-v1',
        capabilities: { canPrint: true, canPrintMobile: true },
        document: { templateId: 'prediction-v1', version: 1 },
      })
    );
    expect(hint).toBe(
      'Uzupełnij imię i przepowiednie, pobierz PDF, a potem podaj urządzenie następnej osobie.'
    );
  });

  it('asks to fill names and guesses for the detective report', () => {
    const hint = specialPrintableHint(
      descriptor({
        engine: 'CARD_FORM',
        contentKey: 'gift-detective-v1',
        capabilities: { canPrint: true, canPrintMobile: true },
        document: { templateId: 'detective-report-v1', version: 1 },
      })
    );
    expect(hint).toBe('Wpisz imiona i typy, potem pobierz raport PDF — kto na co stawiał.');
  });

  it('asks to add then-and-now photos before downloading the landscape card', () => {
    const hint = specialPrintableHint(
      descriptor({
        engine: 'IMAGE_CARD',
        contentKey: 'photo-then-now-v1',
        capabilities: { canPrint: true, canPrintMobile: true },
        document: { templateId: 'then-now-v1', version: 1 },
      })
    );
    expect(hint).toBe('Dodaj zdjęcie „wtedy” i „dziś”, potem pobierz poziomą kartę PDF.');
  });

  it('offers a printable score card you can mark like bingo', () => {
    const hint = specialPrintableHint(
      descriptor({
        engine: 'CHECKLIST',
        variant: 'SCORE',
        contentKey: 'illumination-hunt-v1',
        capabilities: { canPrint: true, canPrintMobile: true },
        document: { templateId: 'score-summary-v1', version: 1 },
      })
    );
    expect(hint).toBe('Zagraj tutaj albo pobierz kartę i zaznaczaj punkty na papierze — jak w bingo.');
  });
});

describe('bingoBoardStatus', () => {
  const items = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

  it('detects a completed row', () => {
    expect(bingoBoardStatus(items, { A: true, B: true, C: true }).hasLine).toBe(true);
    expect(bingoBoardStatus(items, { A: true, B: true, C: true }).blackout).toBe(false);
  });

  it('detects a full board', () => {
    const checked = Object.fromEntries(items.map((item) => [item, true]));
    expect(bingoBoardStatus(items, checked)).toEqual({ hasLine: true, blackout: true });
  });
});

describe('prompt timer', () => {
  it('counts down a minute in mm:ss', () => {
    const start = '2026-08-17T19:00:00.000Z';
    const now = Date.parse('2026-08-17T19:00:10.000Z');
    expect(remainingTimerSeconds(start, 60, now)).toBe(50);
    expect(formatMmSs(59)).toBe('0:59');
    expect(formatMmSs(60)).toBe('1:00');
    expect(formatMmSs(0)).toBe('0:00');
  });
});

describe('nextUniqueDraw', () => {
  it('never repeats an item until the deck is empty', () => {
    const pool = ['A', 'B', 'C'];
    const seen = new Set<string>();
    let used: string[] = [];
    for (let i = 0; i < 3; i++) {
      const next = nextUniqueDraw(pool, used);
      expect(next.item).toBeTruthy();
      expect(seen.has(next.item!)).toBe(false);
      seen.add(next.item!);
      used = next.used;
      expect(next.drawnCount).toBe(i + 1);
      expect(next.total).toBe(3);
    }
    expect(nextUniqueDraw(pool, used).item).toBeNull();
    expect(nextUniqueDraw(pool, used).remaining).toBe(0);
  });
});

describe('isMobilePrintable', () => {
  it('allows letters and rankings, not bingo', () => {
    expect(
      isMobilePrintable({
        document: { templateId: 'santa-adult-letter-v1' },
        capabilities: { canPrint: true, canPrintMobile: true },
      })
    ).toBe(true);
    expect(
      isMobilePrintable({
        document: { templateId: 'bingo-v1' },
        capabilities: { canPrint: true, canPrintMobile: false },
      })
    ).toBe(false);
  });
});

describe('resolveRandomizerConfig', () => {
  it('does not invent a fake prompt when the pack is missing', () => {
    const config = resolveRandomizerConfig(null);
    expect(config.pool).toEqual([]);
    expect(config.uniqueDraw).toBe(false);
    expect(config.copy.emptyLabel).toBe('Wylosuj zadanie');
  });

  it('reads a unique prompt deck and copy from JSON', () => {
    const pack = resolvePack('reindeer-challenge-v1');
    expect(pack).toBeTruthy();
    const config = resolveRandomizerConfig(pack);
    expect(config.pool.length).toBe(30);
    expect(config.pool).toContain('Chcę kakao');
    expect(config.pool).toContain('Mikołaj zgubił worek');
    expect(config.uniqueDraw).toBe(true);
    expect(config.timerSeconds).toBe(60);
    expect(config.successTarget).toBe(3);
    expect(config.markGuessed).toBe(true);
    expect(config.copy.itemNoun).toBe('Komunikat');
    expect(config.copy.ctaLabel).toBe('Start');
    expect(config.copy.startLabel).toBe('Start');
    expect(config.copy.newRoundLabel).toBe('Jeszcze raz');
    expect(config.copy.modeLabel).toBe('Gest + odgłos');
    expect(formatRandomizerProgress(config.copy.itemNoun, 2, 30)).toBe('Komunikat 2 z 30');
  });

  it('keeps charades as a password deck without guess scoring', () => {
    const config = resolveRandomizerConfig(resolvePack('christmas-charades-v1'));
    expect(config.pool.length).toBe(56);
    expect(config.uniqueDraw).toBe(true);
    expect(config.markGuessed).toBe(false);
    expect(config.copy.ctaLabel).toBe('Wylosuj hasło');
    expect(config.pool).toContain('Kevin sam w domu');
    expect(config.pool).toContain('Śnieżynka');
    expect(config.pool).toContain('Przy wigilijnym stole');
  });

  it('reads secret elf mission sets of three household-friendly tasks', () => {
    const config = resolveRandomizerConfig(resolvePack('secret-elf-missions-v1'));
    expect(config.sets).toHaveLength(10);
    expect(config.sets.every((set) => set.length === 3)).toBe(true);
    expect(config.nameField).toBe('Dla kogo');
    expect(config.uniqueDraw).toBe(true);
    expect(config.copy.ctaLabel).toBe('Wylosuj misję');
    expect(config.sets.flat().some((item) => /herbat/i.test(item))).toBe(true);
    expect(splitSetDraw(config.pool[0])).toEqual(config.sets[0]);
  });

  it('falls back to missions when prompts are absent', () => {
    const config = resolveRandomizerConfig({
      missions: ['Zostaw notatkę', 'Podaj drzwi'],
    });
    expect(config.pool).toEqual(['Zostaw notatkę', 'Podaj drzwi']);
    expect(config.uniqueDraw).toBe(false);
  });

  it('treats trivia facts as a unique deck with a replay label', () => {
    const config = resolveRandomizerConfig(resolvePack('christmas-trivia-v1'));
    expect(config.uniqueDraw).toBe(true);
    expect(config.pool.length).toBeGreaterThanOrEqual(20);
    expect(config.copy.itemNoun).toBe('Ciekawostka');
    expect(config.copy.nextLabel).toBe('Następna ciekawostka');
    expect(config.copy.newRoundLabel).toBe('Jeszcze raz');
  });
});

describe('specialCtaLabel', () => {
  it('takes the button label from the content pack', () => {
    expect(
      specialCtaLabel(
        descriptor({ engine: 'RANDOMIZER_TIMER', contentKey: 'reindeer-challenge-v1' })
      )
    ).toBe('Start');
    expect(
      specialCtaLabel(
        descriptor({ engine: 'RANDOMIZER_TIMER', contentKey: 'christmas-charades-v1' })
      )
    ).toBe('Wylosuj hasło');
    expect(
      specialCtaLabel(descriptor({ engine: 'CARD_FORM', contentKey: 'adult-santa-letter-v1' }))
    ).toBe('Napisz list');
    expect(
      specialCtaLabel(descriptor({ engine: 'CARD_FORM', contentKey: 'christmas-prediction-v1' }))
    ).toBe('Zapisz przepowiednie');
    expect(
      specialCtaLabel(descriptor({ engine: 'CARD_FORM', contentKey: 'gift-detective-v1' }))
    ).toBe('Zapisz typy');
    expect(
      specialCtaLabel(descriptor({ engine: 'RANDOMIZER_TIMER', contentKey: 'secret-elf-missions-v1' }))
    ).toBe('Wylosuj misję');
    expect(
      specialCtaLabel(descriptor({ engine: 'IMAGE_CARD', contentKey: 'photo-then-now-v1' }))
    ).toBe('Dodaj zdjęcia');
    expect(
      specialCtaLabel(descriptor({ engine: 'CHECKLIST', variant: 'SCORE', contentKey: 'illumination-hunt-v1' }))
    ).toBe('Zacznij polowanie');
  });

  it('keeps engine fallbacks when the pack has no cta', () => {
    expect(packCtaLabel(null)).toBeNull();
    expect(specialCtaLabel(descriptor({ engine: 'QUIZ' }))).toBe('Rozpocznij quiz');
  });
});

describe('resolveCardFormConfig', () => {
  it('names optional prediction fields from JSON instead of Pole 1', () => {
    const config = resolveCardFormConfig(resolvePack('christmas-prediction-v1'));
    expect(config.fields).toEqual(['Przepowiednia 1', 'Przepowiednia 2', 'Przepowiednia 3']);
    expect(config.fieldsOptional).toBe(true);
    expect(config.allowMultipleCards).toBe(false);
    expect(config.clearOnPrint).toBe(true);
    expect(config.nameField).toBe('Imię');
    expect(config.notes).toEqual([
      'Pola są opcjonalne — możesz uzupełnić do trzech przepowiedni.',
      'Po pobraniu PDF pola się wyczyszczą. Możesz wtedy podać urządzenie następnej osobie, żeby zapisała swoje przepowiednie.',
    ]);
  });

  it('turns gift detective into a 6-person name-and-guess roster', () => {
    const config = resolveCardFormConfig(resolvePack('gift-detective-v1'));
    expect(config.fields).toEqual(['Typ']);
    expect(config.nameField).toBe('Imię');
    expect(config.allowMultipleCards).toBe(true);
    expect(config.entryLayout).toBe('roster');
    expect(config.maxCards).toBe(6);
    expect(config.addCardLabel).toBe('Dodaj uczestnika');
    const cards = readFormCards(
      {
        cards: [
          { name: 'Ania', fields: { Typ: 'skarpetki' } },
          { name: 'Tomek', fields: { Typ: 'czekolada' } },
        ],
      },
      config
    );
    expect(cards).toHaveLength(2);
    expect(cards[0]).toEqual({ name: 'Ania', fields: { Typ: 'skarpetki' } });
    expect(readFormCards({ cards: Array.from({ length: 8 }, (_, i) => ({ name: `O${i}` })) }, config)).toHaveLength(6);
  });

  it('keeps explicit letter fields', () => {
    const config = resolveCardFormConfig(resolvePack('adult-santa-letter-v1'));
    expect(config.fields).toHaveLength(3);
    expect(config.fields[0]).toMatch(/choink/i);
    expect(config.allowMultipleCards).toBe(false);
    expect(config.letterGreeting).toMatch(/Mikołaju/i);
  });

  it('reads existing cards from progress', () => {
    const config = resolveCardFormConfig(resolvePack('christmas-prediction-v1'));
    const cards = readFormCards(
      {
        cards: [{ name: 'Ania', fields: { 'Przepowiednia 1': 'Będzie śnieg' } }],
      },
      config
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe('Ania');
    expect(cards[0].fields['Przepowiednia 1']).toBe('Będzie śnieg');
    expect(cards[0].fields['Przepowiednia 2']).toBe('');
  });

  it('clears name and predictions after a PDF download', () => {
    const config = resolveCardFormConfig(resolvePack('christmas-prediction-v1'));
    expect(clearedFormProgress(config)).toEqual({
      name: '',
      fields: {
        'Przepowiednia 1': '',
        'Przepowiednia 2': '',
        'Przepowiednia 3': '',
      },
      cards: [],
      started: true,
    });
  });
});

describe('resolveQuizConfig', () => {
  it('exposes a replay label and session size from JSON', () => {
    const config = resolveQuizConfig(resolvePack('christmas-quiz-v1'));
    expect(config.questions.length).toBeGreaterThanOrEqual(7);
    expect(config.questionsPerSession).toBe(7);
    expect(config.replayLabel).toBe('Jeszcze raz');
    expect(formatQuizResult(config.resultLabel, 5, 7)).toBe('Wynik: 5/7');
  });

  it('picks a shuffled session of the requested size', () => {
    const config = resolveQuizConfig(resolvePack('christmas-quiz-v1'));
    const session = pickQuizSession(config.questions, config.questionsPerSession, 'seed-a');
    expect(session).toHaveLength(7);
    expect(pickQuizSession(config.questions, 7, 'seed-a').map((q) => q.text)).toEqual(
      session.map((q) => q.text)
    );
  });
});

describe('resolveImageCardConfig', () => {
  it('reads then/now slots and the photo CTA from JSON', () => {
    const config = resolveImageCardConfig(resolvePack('photo-then-now-v1'));
    expect(config.slots).toEqual([
      { id: 'then', label: 'Wtedy' },
      { id: 'now', label: 'Dziś' },
    ]);
    expect(config.captionField).toBe('Podpis');
    expect(config.kicker).toBe('Wtedy i dziś');
    expect(config.formatsHint).toMatch(/JPG, PNG, WEBP lub GIF/);
    expect(config.accept).toMatch(/image\/jpeg/);
    expect(config.accept).toMatch(/image\/png/);
    expect(photoSrc({ then: { url: 'https://cdn.example/then.jpg' } }, 'then')).toBe(
      'https://cdn.example/then.jpg'
    );
  });
});

describe('resolveScoreHuntConfig', () => {
  it('exposes six houses, a legend and rank titles from JSON', () => {
    const config = resolveScoreHuntConfig(resolvePack('illumination-hunt-v1'));
    expect(config.houseCount).toBe(6);
    expect(config.maxPoints).toBe(6);
    expect(config.legend).toEqual([
      { points: 1, label: 'Lampki' },
      { points: 2, label: 'Renifer' },
      { points: 3, label: 'Efektowny dom lub witryna' },
    ]);
    const houses = readScoreHouses(
      { houses: [{ name: 'ul. Lipowa', points: 3 }, { name: '', points: 2 }] },
      config.houseCount
    );
    expect(houses).toHaveLength(6);
    expect(houses[0]).toEqual({ name: 'ul. Lipowa', points: 3 });
    expect(scoreHuntTotal(houses)).toBe(5);
    expect(scoreHuntTitle(config.titles, 0)).toBe('Początek tropu');
    expect(scoreHuntTitle(config.titles, 12)).toBe('Mistrz iluminacji');
  });
});

describe('new universal engines', () => {
  it('resolves option configurator sections from preparations pack', () => {
    const config = resolveOptionConfiguratorConfig(resolvePack('emergency-gift-ideas-v1'));
    expect(config.sections.length).toBeGreaterThanOrEqual(2);
    const summary = formatOptionSelections(config, {
      [config.sections[0].id]: config.sections[0].options[0],
    });
    expect(summary[0]).toContain(config.sections[0].label);
  });

  it('resolves template personalizer fields and themes', () => {
    const config = resolveTemplatePersonalizerConfig(resolvePack('labels-personalizer-v1'));
    expect(config.fields).toContain('Dla');
    expect(config.themeOptions.length).toBeGreaterThan(0);
  });

  it('resolves turn-based alphabet game', () => {
    const config = resolveTurnBasedGameConfig(resolvePack('christmas-alphabet-v1'));
    expect(config.timerSeconds).toBe(5);
    expect(config.playerCount).toBeGreaterThanOrEqual(2);
    const first = nextTurnLetter(config.letters, 0);
    expect(first.letter).toBeTruthy();
    expect(first.finished).toBe(false);
  });

  it('resolves theatre sets for randomizer', () => {
    const config = resolveRandomizerConfig(resolvePack('christmas-theatre-v1'));
    expect(config.sets.length).toBeGreaterThanOrEqual(20);
    expect(config.timerSeconds).toBe(60);
  });

  it('loads creative DIY packs by content key', () => {
    expect(resolvePack('paper-reindeer-v1')?.steps).toBeTruthy();
    expect(resolvePack('origami-guide-v1')?.printHint).toBeTruthy();
  });

  it('completes OPTION_CONFIGURATOR and TURN_BASED_GAME', () => {
    expect(
      canCompleteEngine({
        engine: 'OPTION_CONFIGURATOR',
        completionRule: { type: 'DEFAULT' },
        payload: { selections: { a: 'x' }, started: true },
      }).canComplete
    ).toBe(true);
    expect(
      canCompleteEngine({
        engine: 'TURN_BASED_GAME',
        completionRule: { type: 'DEFAULT' },
        payload: { roundFinished: true },
      }).canComplete
    ).toBe(true);
  });
});


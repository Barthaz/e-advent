'use strict';

const { sanitizeTasksForClient, findTaskByDay } = require('../../services/special/taskSanitizer');
const { canCompleteEngine } = require('../../services/special/completionRules');

describe('taskSanitizer', () => {
  test('does not expose catalogTaskId for closed tasks', () => {
    const tasks = [
      { day: 1, title: 'Test', status: 'closed', catalogTaskId: 'set-1-task-5' },
      { day: 2, title: 'Open', status: 'opened', catalogTaskId: 'set-1-task-6' },
    ];
    const sanitized = sanitizeTasksForClient(tasks);
    expect(sanitized[0].catalogTaskId).toBeUndefined();
    expect(sanitized[1].catalogTaskId).toBe('set-1-task-6');
    expect(sanitized[0].special).toBeUndefined();
  });

  test('attaches special descriptor only for opened premium tasks', () => {
    const calendar = {
      status: 'succeeded',
      isFree: false,
      data: { sku: 'interactive' },
    };
    const tasks = [
      { day: 5, title: 'Quiz', status: 'closed', catalogTaskId: 'set-1-task-5' },
      { day: 4, title: 'Ranking', status: 'opened', catalogTaskId: 'set-1-task-24' },
    ];
    const sanitized = sanitizeTasksForClient(tasks, calendar);
    expect(sanitized[0].special).toBeUndefined();
    expect(sanitized[0].catalogTaskId).toBeUndefined();
    expect(sanitized[1].isSpecial).toBe(true);
    expect(sanitized[1].special.engine).toBe('SORTABLE_LIST');
  });

  test('findTaskByDay returns matching task', () => {
    const calendar = {
      data: {
        tasks: [{ day: 3, title: 'Day 3', status: 'opened', catalogTaskId: 'set-1-task-3' }],
      },
    };
    const task = findTaskByDay(calendar, 3);
    expect(task?.catalogTaskId).toBe('set-1-task-3');
  });
});

describe('completionRules', () => {
  test('quiz completes when finished', () => {
    const result = canCompleteEngine({
      engine: 'QUIZ',
      completionRule: { type: 'DEFAULT' },
      payload: { finished: true },
    });
    expect(result.canComplete).toBe(true);
  });

  test('checklist requires minimum items', () => {
    const result = canCompleteEngine({
      engine: 'CHECKLIST',
      completionRule: { type: 'DEFAULT', minItems: 2 },
      payload: { checked: { a: true } },
    });
    expect(result.canComplete).toBe(false);
  });

  test('image card completes with two photos', () => {
    const result = canCompleteEngine({
      engine: 'IMAGE_CARD',
      completionRule: { type: 'DEFAULT' },
      payload: {
        photos: {
          then: { url: 'https://cdn.example/then.jpg' },
          now: { dataUrl: 'data:image/jpeg;base64,xx' },
        },
      },
    });
    expect(result.canComplete).toBe(true);
  });

  test('illumination hunt completes after one house is scored', () => {
    const result = canCompleteEngine({
      engine: 'CHECKLIST',
      completionRule: { type: 'DEFAULT' },
      payload: { houses: [{ name: 'żółty dom', points: 3 }] },
    });
    expect(result.canComplete).toBe(true);
  });
});

describe('DocumentRegistry', () => {
  const { buildDocumentDefinition } = require('../../services/special/DocumentRegistry');

  test('ranking document defaults to landscape without special-window kicker', () => {
    const definition = buildDocumentDefinition(
      {
        headline: 'Grudniowy ranking filmów świątecznych',
        description: 'TOP 5',
        document: { templateId: 'ranking-v1', defaultPage: 'A5', version: 1 },
      },
      { items: ['Kevin sam w domu', 'To właśnie miłość'] },
      'COLOR',
    );
    expect(definition.page.orientation).toBe('LANDSCAPE');
    expect(definition.page.size).toBe('A5');
    expect(definition.layout).toBe('LANDSCAPE');
    expect(definition.title).toBe('Grudniowy ranking filmów świątecznych');
    expect(definition.nodes.some((n) => n.type === 'Kicker')).toBe(false);
    const heading = definition.nodes.find((n) => n.type === 'Heading');
    expect(heading.text).toBe('Grudniowy ranking filmów świątecznych');
    const rank = definition.nodes.find((n) => n.type === 'RankList');
    expect(rank.items).toEqual(['Kevin sam w domu', 'To właśnie miłość']);
  });

  test('quiz result PDF uses the proper title and score', () => {
    const definition = buildDocumentDefinition(
      {
        headline: 'Quiz wiedzy o Bożym Narodzeniu',
        document: { templateId: 'quiz-result-v1', defaultPage: 'A5', version: 1 },
      },
      { score: 5, sessionQuestions: [1, 2, 3, 4, 5, 6, 7] },
      'COLOR',
    );
    expect(definition.title).toBe('Quiz wiedzy o Bożym Narodzeniu');
    expect(definition.nodes.some((n) => n.text === 'Wynik: 5/7')).toBe(true);
  });

  test('layout override can force a square page', () => {
    const definition = buildDocumentDefinition(
      {
        headline: 'Przepis',
        document: { templateId: 'recipe-v1', defaultPage: 'A5', version: 1 },
      },
      {},
      'COLOR',
      'SQUARE',
    );
    expect(definition.page.size).toBe('SQUARE');
    expect(definition.layout).toBe('SQUARE');
  });

  test('bingo PDF is a centered 3x3 grid, not a list', () => {
    const definition = buildDocumentDefinition(
      {
        headline: 'Świąteczne bingo na grudniowy spacer',
        contentKey: 'christmas-bingo-v1',
        document: { templateId: 'bingo-v1', defaultPage: 'A5', version: 1 },
      },
      { checked: { Renifer: true, Gwiazda: true, Choinka: true } },
      'COLOR',
    );
    expect(definition.nodes.some((n) => n.type === 'CheckboxList')).toBe(false);
    const grid = definition.nodes.find((n) => n.type === 'BingoGrid');
    expect(grid.columns).toBe(3);
    expect(grid.items).toHaveLength(9);
    expect(grid.checked.slice(0, 3)).toEqual([true, true, true]);
  });

  test('adult santa letter PDF is a letter, not a field list', () => {
    const definition = buildDocumentDefinition(
      {
        headline: 'List do Mikołaja dla dorosłych',
        contentKey: 'adult-santa-letter-v1',
        document: { templateId: 'santa-adult-letter-v1', defaultPage: 'A5', version: 1 },
      },
      {
        fields: {
          'Co można położyć pod choinką': 'nowy sweter',
          'Jakie przeżycie warto dostać': 'weekend bez telefonu',
          'Czego nie kupi się w żadnym sklepie': 'trochę ciszy',
        },
      },
      'COLOR',
    );
    const texts = definition.nodes.map((n) => String(n.text || ''));
    expect(texts).toContain('Drogi Mikołaju,');
    expect(texts.some((t) => t.includes('było całkiem grzecznie'))).toBe(true);
    expect(texts.some((t) => t.includes('Pod choinkę może trafić nowy sweter'))).toBe(true);
    expect(texts.some((t) => t.includes('Z grudniowym pozdrowieniem'))).toBe(true);
    expect(texts.some((t) => t.startsWith('Co można położyć pod choinką:'))).toBe(false);
    expect(texts).not.toContain('byłem');
    expect(texts).not.toContain('byłam');
  });

  test('prediction PDF includes the name and filled predictions', () => {
    const definition = buildDocumentDefinition(
      {
        headline: 'Świąteczna przepowiednia na Wigilię',
        description: 'Świąteczna prognoza',
        contentKey: 'christmas-prediction-v1',
        document: { templateId: 'prediction-v1', defaultPage: 'A5', version: 1 },
      },
      {
        name: 'Ania',
        fields: {
          'Przepowiednia 1': 'Będzie śnieg',
          'Przepowiednia 2': '',
          'Przepowiednia 3': 'Ktoś dostanie ciepły szalik',
        },
      },
      'COLOR',
    );
    expect(definition.layout).toBe('PORTRAIT');
    expect(definition.page.size).toBe('A5');
    expect(definition.page.orientation).toBe('PORTRAIT');
    const texts = definition.nodes.map((n) => String(n.text || ''));
    expect(texts).toContain('Ania');
    expect(texts).toContain('Przepowiednia 1');
    expect(texts).toContain('Będzie śnieg');
    expect(texts).toContain('Przepowiednia 3');
    expect(texts).toContain('Ktoś dostanie ciepły szalik');
    expect(texts).not.toContain('Przepowiednia 2');
    expect(texts.some((t) => t.startsWith('Pole '))).toBe(false);
  });

  test('detective report PDF lists who guessed what', () => {
    const definition = buildDocumentDefinition(
      {
        headline: 'Raport Prezentowego Detektywa',
        description: 'Karta Prezentowego Detektywa',
        contentKey: 'gift-detective-v1',
        document: { templateId: 'detective-report-v1', defaultPage: 'A5', version: 1 },
      },
      {
        cards: [
          { name: 'Ania', fields: { Typ: 'skarpetki' } },
          { name: 'Tomek', fields: { Typ: 'czekolada' } },
          { name: '', fields: { Typ: '' } },
        ],
      },
      'COLOR',
    );
    const texts = definition.nodes.map((n) => String(n.text || ''));
    expect(texts).toContain('Raport detektywów');
    expect(texts).toContain('Kto na co stawiał');
    const list = definition.nodes.find((n) => n.type === 'GuessList');
    expect(list.items).toEqual([
      { name: 'Ania', guess: 'skarpetki' },
      { name: 'Tomek', guess: 'czekolada' },
    ]);
    expect(texts.some((t) => t.startsWith('Pole '))).toBe(false);
  });

  test('then-now PDF places photos side by side in landscape', () => {
    const definition = buildDocumentDefinition(
      {
        headline: 'Fotograficzny powrót — wtedy i dziś',
        description: 'Fotograficzny powrót — przed i po',
        contentKey: 'photo-then-now-v1',
        document: { templateId: 'then-now-v1', defaultPage: 'A5', version: 1 },
      },
      {
        photos: {
          then: { url: 'https://cdn.example/then.jpg' },
          now: { dataUrl: 'data:image/jpeg;base64,xx' },
        },
        caption: 'grudzień 2016 i grudzień 2026',
      },
      'COLOR',
      'PORTRAIT',
    );
    expect(definition.layout).toBe('LANDSCAPE');
    expect(definition.page.orientation).toBe('LANDSCAPE');
    expect(definition.page.size).toBe('A5');
    const pair = definition.nodes.find((n) => n.type === 'PhotoPair');
    expect(pair.items).toEqual([
      { label: 'Wtedy', src: 'https://cdn.example/then.jpg' },
      { label: 'Dziś', src: 'data:image/jpeg;base64,xx' },
    ]);
    expect(definition.nodes.map((n) => String(n.text || ''))).toContain('grudzień 2016 i grudzień 2026');
  });

  test('illumination hunt PDF is a markable game card', () => {
    const definition = buildDocumentDefinition(
      {
        headline: 'Polowanie na iluminacje',
        description: 'Polowanie na iluminacje',
        contentKey: 'illumination-hunt-v1',
        document: { templateId: 'score-summary-v1', defaultPage: 'A5', version: 1 },
      },
      {
        houses: [
          { name: 'żółty dom', points: 3 },
          { name: 'ul. Lipowa', points: 2 },
          { name: '', points: 1 },
        ],
      },
      'COLOR',
    );
    expect(definition.layout).toBe('PORTRAIT');
    expect(definition.nodes.map((n) => String(n.text || ''))).toContain(
      'Zaznacz, ile punktów ma każdy dom — jak na planszy do gry. Puste linie dopisz ołówkiem.'
    );
    expect(definition.nodes.map((n) => String(n.text || ''))).toContain('Suma: ______ pkt');
    const board = definition.nodes.find((n) => n.type === 'ScoreHuntBoard');
    expect(board.maxPoints).toBe(6);
    expect(board.houseCount).toBe(6);
    expect(board.houses).toHaveLength(6);
    expect(board.houses[0]).toEqual({ name: 'żółty dom', points: 3 });
    expect(board.houses[2]).toEqual({ name: '', points: 1 });
    expect(board.houses[5]).toEqual({ name: '', points: 0 });
    expect(definition.nodes.some((n) => n.type === 'GuessList')).toBe(false);
  });
});

describe('special headlines', () => {
  const registry = require('../../../../packages/content/generated/special-config-registry.json');

  test('uses concrete nominative titles instead of genitive day names', () => {
    expect(registry.entries['set-1-task-5'].headline).toBe('Quiz wiedzy o Bożym Narodzeniu');
    expect(registry.entries['set-1-task-24'].headline).toBe('Grudniowy ranking filmów świątecznych');
    expect(registry.entries['set-1-task-6'].headline).toBe('List do Mikołaja dla dorosłych');
  });

  test('every special window has a headline', () => {
    const missing = Object.entries(registry.entries)
      .filter(([, entry]) => !entry.headline)
      .map(([id]) => id);
    expect(missing).toEqual([]);
    expect(Object.keys(registry.entries)).toHaveLength(70);
  });

  test('quiz and live games are not printable', () => {
    expect(registry.entries['set-1-task-5'].capabilities.canPrint).toBe(false);
    expect(registry.entries['set-1-task-5'].document).toBeUndefined();
    expect(registry.entries['set-1-task-11'].capabilities.canPrint).toBe(false);
    expect(registry.entries['set-1-task-11'].document).toBeUndefined();
    expect(registry.entries['set-1-task-22'].capabilities.canPrint).toBe(false);
    expect(registry.entries['set-1-task-10']).toBeUndefined();
    expect(registry.entries['set-1-task-19']).toBeUndefined();
    expect(registry.entries['set-1-task-7'].capabilities.canPrint).toBe(true);
  });

  test('printable specials default to A5', () => {
    const pages = Object.values(registry.entries)
      .filter((entry) => entry.document)
      .map((entry) => entry.document.defaultPage);
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.every((size) => size === 'A5')).toBe(true);
  });

  test('mobile print is lists and letters, not bingo or games', () => {
    expect(registry.entries['set-1-task-7'].capabilities.canPrintMobile).toBe(false);
    expect(registry.entries['set-1-task-6'].capabilities.canPrintMobile).toBe(true);
    expect(registry.entries['set-1-task-6'].document.templateId).toBe('santa-adult-letter-v1');
    expect(registry.entries['set-1-task-24'].capabilities.canPrintMobile).toBe(true);
    expect(registry.entries['set-1-task-28'].capabilities.canPrintMobile).toBe(true);
    expect(registry.entries['set-1-task-28'].document.templateId).toBe('prediction-v1');
    expect(registry.entries['set-1-task-23'].capabilities.canPrintMobile).toBe(true);
    expect(registry.entries['set-1-task-23'].document.templateId).toBe('detective-report-v1');
    expect(registry.entries['set-1-task-17'].capabilities.canPrint).toBe(true);
    expect(registry.entries['set-1-task-17'].capabilities.canPrintMobile).toBe(true);
    expect(registry.entries['set-1-task-17'].document.templateId).toBe('then-now-v1');
    expect(registry.entries['set-1-task-15'].capabilities.canPrint).toBe(true);
    expect(registry.entries['set-1-task-15'].capabilities.canPrintMobile).toBe(true);
    expect(registry.entries['set-1-task-15'].document.templateId).toBe('score-summary-v1');
    expect(registry.entries['set-2-task-1'].capabilities.canPrintMobile).toBe(true);
    expect(registry.entries['set-6-task-1'].capabilities.canPrintMobile).toBe(true);
  });
});

describe('special preview export', () => {
  const { getPreviewExportDescriptor } = require('../../routes/specialPreview');

  test('refuses quiz and allows bingo', () => {
    expect(getPreviewExportDescriptor('set-1-task-5')).toBeNull();
    expect(getPreviewExportDescriptor('set-1-task-22')).toBeNull();
    expect(getPreviewExportDescriptor('set-1-task-7')?.document.templateId).toBe('bingo-v1');
  });
});

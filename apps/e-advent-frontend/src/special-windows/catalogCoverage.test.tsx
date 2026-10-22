import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SpecialWindowDescriptor, SpecialWindowProgress } from '@e-advent/types';
import registry from '../../../../packages/content/generated/special-config-registry.json';
import catalog from '../../../../packages/content/generated/creator-index.json';
import source from '../../../../packages/content/catalog/e-advent-calendars-data.json';
import WebEngine from './EngineRouter';
import MobileEngine from '../../../e-advent-app/special-windows/EngineRouter';
import { resolvePack } from './contentPacks';
import { isMobilePrintable } from '@e-advent/special-core';

vi.mock('../api/api', () => ({ uploadSpecialImage: vi.fn() }));
vi.mock('../../../e-advent-app/api/api', () => ({ uploadSpecialImage: vi.fn() }));

it('includes every source task and every special descriptor in the creator pool', () => {
  const sourceIds = source.sets.flatMap(set => set.tasks.map(task => task.id)).sort();
  expect(catalog.sets.flatMap(set => set.tasks.map(task => task.catalogTaskId)).sort()).toEqual(sourceIds);
  for (const id of Object.keys(registry.entries)) expect(catalog.catalogTaskById).toHaveProperty(id);
});

for (const [platform, Engine] of [['web', WebEngine], ['mobile', MobileEngine]] as const) {
  it(`${platform}: shows scoring next to the gingerbread photo and restores gift label fields`, () => {
    for (const [id, payload, visible] of [
      ['set-5-task-5', { scores: { 'Klasyczny ludzik': 4 } }, ['Klasyczny ludzik', 'Eksperyment domowy']],
      ['set-5-task-22', { fields: { Dla: 'Babcia Zosia', 'Krótka dedykacja': 'Słodkich Świąt' } }, ['Babcia Zosia', 'Słodkich Świąt']],
    ] as const) {
      const descriptor = registry.entries[id] as SpecialWindowDescriptor;
      const progress = { taskId: id, configId: descriptor.configId, status: 'IN_PROGRESS', payloadVersion: 1, updatedAt: '', payload } as SpecialWindowProgress;
      const html = renderToStaticMarkup(<Engine descriptor={descriptor} progress={progress} onUpdate={() => {}} calendarId="preview-test" day={1} />);
      for (const text of visible) expect(html).toContain(text);
    }
  });
  it(`${platform}: family recipe restores editable ingredients, method and existing history`, () => {
    const descriptor = registry.entries['set-5-task-27'] as SpecialWindowDescriptor;
    expect(descriptor.engine).toBe('CARD_FORM');
    const fields = { 'Składniki i ilości': '500 g mąki', 'Przygotowanie krok po kroku': 'Ulep pierogi.', 'Kto go przekazał': 'Babcia' };
    const progress = { taskId: 'set-5-task-27', configId: descriptor.configId, status: 'IN_PROGRESS', payloadVersion: 1, updatedAt: '', payload: { fields } } as SpecialWindowProgress;
    const html = renderToStaticMarkup(<Engine descriptor={descriptor} progress={progress} onUpdate={() => {}} calendarId="preview-test" day={1} />);
    for (const value of Object.values(fields)) expect(html).toContain(value);
    expect(html).toContain('Nazwa potrawy');
  });
}

describe.each(Object.entries(registry.entries))('%s', (id, entry) => {
  const descriptor = entry as SpecialWindowDescriptor;
  it('has content and matching web/mobile print rules', () => {
    expect(resolvePack(descriptor.contentKey)).toBeTruthy();
    expect(isMobilePrintable(descriptor)).toBe(Boolean(descriptor.document && descriptor.capabilities?.canPrint && descriptor.capabilities?.canPrintMobile));
  });
  for (const [platform, Engine] of [['web', WebEngine], ['mobile', MobileEngine]] as const) {
    it(`${platform}: renders initial and resumed state with task content`, () => {
      const base = { taskId: id, configId: id, status: 'IN_PROGRESS', payloadVersion: 1, updatedAt: '2026-10-20T00:00:00Z' };
      for (const payload of [{ started: true }, { started: true, fields: {}, rows: [], items: [], checked: {} }]) {
        const html = renderToStaticMarkup(<Engine descriptor={descriptor} progress={{ ...base, payload } as SpecialWindowProgress} onUpdate={() => {}} calendarId="preview-test" day={1} />);
        expect(html.length).toBeGreaterThan(50);
        const host = document.createElement('div');
        host.innerHTML = html;
        const pack = resolvePack(descriptor.contentKey);
        if (descriptor.engine === 'CHECKLIST' && Array.isArray(pack?.items)) {
          for (const item of pack.items) expect(host.textContent).toContain(String(item));
        }
        if (descriptor.engine === 'RECIPE' && Array.isArray(pack?.ingredients)) {
          for (const item of pack.ingredients) expect(host.textContent).toContain(String(item));
        }
      }
    });
  }
});

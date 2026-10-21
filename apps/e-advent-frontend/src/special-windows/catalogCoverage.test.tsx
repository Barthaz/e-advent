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

'use strict';

// Offline verification: real document renderer, synthetic data, no DB/Stripe/SMTP.
// node scripts/verify-special-windows.js [--render] [--craft-only] [--skip-village]
const fs = require('node:fs');
const path = require('node:path');
const { loadRegistry } = require('../services/special/SpecialConfigRegistry');
const { resolveContentPack, buildDocumentDefinition, renderSpecialPdf } = require('../services/special/DocumentRegistry');
const catalog = require('../../../packages/content/generated/creator-index.json');
const root = path.resolve(__dirname, '../../..');
const craftOnly = process.argv.includes('--craft-only');
const output = path.join(root, craftOnly ? '.cache/craft-verification' : '.cache/task-verification');

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const { CRAFT_TEMPLATES } = require('../services/special/CraftSheets');
  const allEntries = Object.entries(loadRegistry().entries);
  const deferred = process.argv.includes('--skip-village')
    ? allEntries.filter(([, d]) => d.document?.templateId === 'paper-village-v1').map(([id]) => id) : [];
  const entries = allEntries.filter(([id, d]) => !deferred.includes(id) && (!craftOnly || CRAFT_TEMPLATES.has(d.document?.templateId)));
  const tasks = catalog.sets.flatMap(set => set.tasks);
  const ids = new Set(tasks.map(task => task.catalogTaskId));
  const results = [];
  const { createCanvas } = require('@napi-rs/canvas');
  const photo = createCanvas(240, 160);
  const ctx = photo.getContext('2d');
  ctx.fillStyle = '#d6b182'; ctx.fillRect(0, 0, 240, 160);
  ctx.fillStyle = '#0f5132'; ctx.fillRect(60, 30, 120, 100);
  const dataUrl = photo.toDataURL('image/png');
  const pdfjs = process.argv.includes('--render') ? await import('pdfjs-dist/legacy/build/pdf.mjs') : null;
  for (const [id, descriptor] of entries) {
    const pack = resolveContentPack(descriptor.contentKey);
    const row = {
      id, title: descriptor.headline, engine: descriptor.engine,
      inCatalog: ids.has(id), contentFound: Boolean(pack),
      pdf: Boolean(descriptor.document && descriptor.capabilities?.canPrint !== false),
      mobilePdf: Boolean(descriptor.document && descriptor.capabilities?.canPrint && descriptor.capabilities?.canPrintMobile),
      variants: [],
    };
    // Use only fields produced by the relevant engine, never unrelated form data.
    const labels = pack?.fields || pack?.prompts || Array.from({ length: pack?.fieldCount || 3 }, (_, i) =>
      (pack?.fieldCount === 1 ? (pack?.fieldNoun || 'Pole') : `${pack?.fieldNoun || 'Pole'} ${i + 1}`));
    const payload = { started: true };
    if (['CARD_FORM', 'TEMPLATE_PERSONALIZER'].includes(descriptor.engine) || descriptor.config?.secondaryEngine === 'TEMPLATE_PERSONALIZER') {
      payload.name = 'Żaneta Łącka';
      payload.fields = Object.fromEntries(labels.map(label => [label, 'Żółć, święta i wspólne wspomnienia.']));
    }
    if (['CHECKLIST', 'SORTABLE_LIST'].includes(descriptor.engine)) {
      payload.items = pack?.items || ['Pierwszy wybór', 'Drugi wybór', 'Trzeci wybór'];
      payload.checked = Object.fromEntries(payload.items.slice(0, 3).map(item => [item, true]));
    }
    if (['PLANNER', 'MONTH_PLANNER'].includes(descriptor.engine)) {
      payload.columns = Array.isArray(pack?.columns) ? pack.columns : ['Zadanie', 'Termin'];
      payload.rows = [payload.columns.map(() => 'Próba')];
    }
    if (descriptor.engine === 'SCORECARD' || descriptor.config?.secondaryEngine === 'SCORECARD') payload.scores = { [pack?.samples?.[0] || 'Próba']: 4 };
    if (descriptor.engine === 'QUIZ') Object.assign(payload, { score: 5, total: 7 });
    if (descriptor.engine === 'IMAGE_CARD') payload.photos = Object.fromEntries(
      (pack?.slots || [{ id: 'then' }, { id: 'now' }]).map(slot => [slot.id, { dataUrl }]),
    );
    if (descriptor.engine === 'OPTION_CONFIGURATOR') payload.result = ['Wybrana opcja: świąteczny zestaw'];
    if (row.pdf) {
      const definition = buildDocumentDefinition(descriptor, payload);
      row.nodeTypes = [...new Set(definition.nodes.map(node => node.type))];
      row.placeholder = JSON.stringify(definition).includes('[Szablon do wycięcia');
      if (pdfjs) {
        for (const variant of descriptor.document.variants || ['COLOR']) {
          try {
            const { buffer } = await renderSpecialPdf(descriptor, payload, variant);
            if (Buffer.from(buffer).subarray(0, 4).toString() !== '%PDF') throw new Error('Not a PDF');
            const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: true }).promise;
            let text = '';
            for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
              const page = await pdf.getPage(pageNo);
              if (definition.craftSheets && (Math.abs(page.view[2] - 210 * 72 / 25.4) > 1 || Math.abs(page.view[3] - 297 * 72 / 25.4) > 1)) {
                throw new Error(`Invalid craft page size: ${page.view.join(', ')}`);
              }
              const pageText = (await page.getTextContent()).items.map(item => item.str || '').join(' ');
              if (pageText.length <= 20) throw new Error(`Empty text on page ${pageNo}`);
              text += pageText;
              if (variant === 'COLOR' || craftOnly) {
                const viewport = page.getViewport({ scale: 0.85 });
                const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                fs.writeFileSync(path.join(output, `${id}${variant === 'INK_SAVER' ? '-INK_SAVER' : ''}${pageNo > 1 ? `-page-${pageNo}` : ''}.png`), canvas.toBuffer('image/png'));
              }
            }
            fs.writeFileSync(path.join(output, `${id}-${variant}.pdf`), buffer);
            row.variants.push({ variant, pages: pdf.numPages, bytes: buffer.length, textLength: text.length, ok: text.length > 20 });
            await pdf.destroy();
          } catch (error) {
            row.variants.push({ variant, ok: false, error: error.message });
          }
        }
      }
    }
    results.push(row);
    if (pdfjs && row.pdf) console.log(id, row.variants.every(v => v.ok) ? 'OK' : 'FAIL');
  }
  const summary = {
    tasks: tasks.length, uniqueIds: ids.size, special: entries.length,
    deferred,
    standard: tasks.filter(task => !task.isSpecial).length,
    printable: results.filter(r => r.pdf).length,
    mobilePrintable: results.filter(r => r.mobilePdf).length,
    missingCatalog: results.filter(r => !r.inCatalog).map(r => r.id),
    missingContent: results.filter(r => !r.contentFound).map(r => r.id),
    exports: results.flatMap(r => r.variants).length,
    failedExports: results.filter(r => r.variants.some(v => !v.ok)).map(r => r.id),
  };
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ summary, results }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (summary.missingCatalog.length || summary.missingContent.length || summary.failedExports.length) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });


'use strict';

const path = require('path');
const fs = require('fs');

const { defaultPdfLayout, normalizePdfLayout, applyPdfLayout } = require('./pdfLayout');

const packsDir = path.resolve(__dirname, '../../../../packages/content/packs');

function loadPackFile(setFile) {
  const raw = fs.readFileSync(path.join(packsDir, setFile), 'utf8');
  return JSON.parse(raw);
}

function resolveContentPack(contentKey) {
  if (!contentKey) return null;
  const files = fs.readdirSync(packsDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const pack = loadPackFile(file);
    if (pack.packs?.[contentKey]) {
      return pack.packs[contentKey];
    }
  }
  return null;
}

function fieldNodes(fields) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return [];
  return Object.entries(fields)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([key, value]) => ({ type: 'Text', text: `${key}: ${value}` }));
}

function formFieldLabels(pack) {
  if (Array.isArray(pack.fields) && pack.fields.length) {
    return pack.fields.map((item) => String(item).trim()).filter(Boolean);
  }
  if (Array.isArray(pack.prompts) && pack.prompts.length) {
    return pack.prompts.map((item) => String(item).trim()).filter(Boolean);
  }
  const noun = String(pack.fieldNoun || 'Pole').trim() || 'Pole';
  const count = Math.max(1, Math.floor(Number(pack.fieldCount) || 3));
  if (count === 1) return [noun];
  return Array.from({ length: count }, (_, i) => `${noun} ${i + 1}`);
}

function formCardsFromPayload(pack, payload) {
  const labels = formFieldLabels(pack);
  const toCard = (card) => ({
    name: String(card?.name || '').trim(),
    fields: labels.map((label) => ({
      label,
      value: String(card?.fields?.[label] || '').trim(),
    })),
  });
  if (Array.isArray(payload.cards) && payload.cards.length) {
    return payload.cards.map(toCard);
  }
  return [toCard({ name: payload.name, fields: payload.fields || {} })];
}

function payloadNodes(data) {
  const nodes = [];
  const name = String(data.name || '').trim();
  if (name) {
    const nameLabel = String(data.nameField || 'Imię').trim() || 'Imię';
    nodes.push({ type: 'Text', text: `${nameLabel}: ${name}`, style: 'accent' });
  }

  if (data.score != null) {
    const total = Array.isArray(data.sessionQuestions) ? data.sessionQuestions.length : (data.total || 7);
    nodes.push({ type: 'Text', text: `Wynik: ${data.score}/${total}`, style: 'accent' });
  }

  if (data.draw) {
    nodes.push({ type: 'Text', text: String(data.draw), style: 'accent' });
  }

  nodes.push(...fieldNodes(data.fields));

  if (Array.isArray(data.items) && data.items.some(Boolean)) {
    const checkedMap = data.checked && typeof data.checked === 'object' ? data.checked : {};
    nodes.push({
      type: 'CheckboxList',
      items: data.items,
      checked: data.items.map((item) => !!checkedMap[item] || !!checkedMap[String(item)]),
    });
  }

  if (Array.isArray(data.rows) && data.rows.length) {
    const columns = data.columns
      || (Array.isArray(data.rows[0]) ? data.rows[0].map((_, i) => `Kolumna ${i + 1}`) : ['Treść']);
    nodes.push({ type: 'Table', columns, rows: data.rows });
  }

  if (data.scores && typeof data.scores === 'object') {
    const rows = Object.entries(data.scores).map(([name, value]) => [name, String(value)]);
    if (rows.length) {
      nodes.push({ type: 'Table', columns: ['Pozycja', 'Ocena'], rows });
    }
  }

  if (data.servings != null) {
    nodes.push({ type: 'Text', text: `Porcje: ${data.servings}`, style: 'muted' });
  }

  if (Array.isArray(data.ingredients) && data.ingredients.length) {
    nodes.push({ type: 'Heading', text: 'Składniki', level: 2 });
    data.ingredients.forEach((item) => nodes.push({ type: 'Text', text: `• ${item}` }));
  }

  if (Array.isArray(data.steps) && data.steps.length) {
    nodes.push({ type: 'Heading', text: 'Kroki', level: 2 });
    data.steps.forEach((step, idx) => nodes.push({ type: 'Text', text: `${idx + 1}. ${step}` }));
  }

  return nodes;
}

const DIY_TEMPLATES = new Set([
  'paper-reindeer-v1',
  'paper-village-v1',
  'origami-guide-v1',
  'garland-v1',
  'salt-dough-guide-v1',
  'stamp-guide-v1',
  'envelope-decor-guide-v1',
  'bookmarks-v1',
  'wrapping-pattern-v1',
  'memory-chain-v1',
  'comic-sheet-v1',
  'coupon-sheet-v1',
  'labels-sheet-v1',
]);

function buildDocumentDefinition(descriptor, progressPayload, variant = 'COLOR', layout) {
  const templateId = descriptor.document?.templateId;
  if (!templateId) return null;

  const pack = resolveContentPack(descriptor.contentKey) || {};
  const payload = progressPayload && typeof progressPayload === 'object' ? progressPayload : {};
  const data = {
    ...pack,
    ...payload,
    items: payload.items || pack.items,
    columns: payload.columns || pack.columns,
    ingredients: payload.ingredients || pack.ingredients,
    steps: payload.steps || pack.steps,
    servings: payload.servings ?? pack.servings,
    title: descriptor.headline,
  };

  const heading = { type: 'Heading', text: descriptor.headline };
  const subtitle = descriptor.description
    ? { type: 'Text', text: descriptor.description, style: 'accent' }
    : null;
  const resolvedLayout = templateId === 'then-now-v1'
    ? 'LANDSCAPE'
    : normalizePdfLayout(layout, defaultPdfLayout(templateId));

  const base = {
    templateId,
    title: descriptor.headline,
    version: descriptor.document.version || 1,
    page: applyPdfLayout(
      { size: descriptor.document.defaultPage || 'A5', orientation: 'PORTRAIT', marginMm: 12 },
      resolvedLayout,
    ),
    layout: resolvedLayout,
    themeId: 'WARM_CREAM',
    variant,
    nodes: [],
  };

  const intro = [heading, subtitle, { type: 'Divider' }].filter(Boolean);
  const footer = { type: 'BrandFooter' };

  if (templateId === 'santa-adult-letter-v1') {
    const fields = payload.fields && typeof payload.fields === 'object' ? payload.fields : {};
    const labels = Array.isArray(pack.fields) ? pack.fields : Object.keys(fields);
    const leads = Array.isArray(pack.letterLeads) ? pack.letterLeads : labels;
    const greeting = String(pack.letterGreeting || 'Drogi Mikołaju,');
    const letterIntro = String(pack.letterIntro || '');
    const outro = String(pack.letterOutro || '');
    const wishNodes = labels.map((label, index) => {
      const value = String(fields[label] || '').trim();
      const lead = String(leads[index] || label).trim();
      let text;
      if (!value) text = `${lead}…`;
      else if (
        /[.!?]$/.test(lead)
        || lead.endsWith('…')
        || lead.endsWith('—')
        || lead.endsWith('–')
        || lead.endsWith(',')
        || lead.endsWith('-')
      ) text = `${lead} ${value}`;
      else text = `${lead} ${value}.`;
      return { type: 'Text', text, style: value ? 'body' : 'muted' };
    });
    base.nodes = [
      { type: 'Kicker', text: 'List do Mikołaja' },
      { type: 'Heading', text: greeting },
      letterIntro ? { type: 'Text', text: letterIntro, style: 'accent' } : null,
      { type: 'Divider' },
      ...wishNodes,
      { type: 'Divider' },
      outro ? { type: 'Text', text: outro, style: 'accent' } : null,
      footer,
    ].filter(Boolean);
    return base;
  }

  if (templateId === 'prediction-v1') {
    const cards = formCardsFromPayload(pack, payload);
    const nodes = [...intro];
    cards.forEach((card, index) => {
      if (cards.length > 1) {
        nodes.push({ type: 'Text', text: `Karta ${index + 1}`, style: 'muted' });
      }
      if (card.name) {
        nodes.push({ type: 'Heading', text: card.name, level: 2 });
      } else {
        nodes.push({ type: 'Text', text: 'Bez podpisu', style: 'muted' });
      }
      const filled = card.fields.filter((field) => field.value);
      if (!filled.length) {
        nodes.push({ type: 'Text', text: 'Brak wpisanych przepowiedni.', style: 'muted' });
      } else {
        filled.forEach((field) => {
          nodes.push({ type: 'Text', text: field.label, style: 'muted' });
          nodes.push({ type: 'Text', text: field.value, style: 'accent' });
        });
      }
      if (index < cards.length - 1) nodes.push({ type: 'Divider' });
    });
    nodes.push(footer);
    base.nodes = nodes;
    return base;
  }

  if (templateId === 'detective-report-v1') {
    const cards = formCardsFromPayload(pack, payload);
    const guesses = cards
      .map((card) => ({
        name: card.name,
        guess: card.fields.map((field) => field.value).filter(Boolean).join(' · '),
      }))
      .filter((item) => item.name || item.guess);
    const kicker = String(pack.reportKicker || 'Raport detektywów').trim();
    const caption = String(pack.reportCaption || 'Kto na co stawiał').trim();
    const nodes = [
      { type: 'Kicker', text: kicker },
      heading,
      subtitle,
      { type: 'Divider' },
      caption ? { type: 'Text', text: caption, style: 'muted' } : null,
    ].filter(Boolean);
    if (!guesses.length) {
      nodes.push({ type: 'Text', text: 'Nikt jeszcze nie postawił typu.', style: 'muted' });
    } else {
      nodes.push({ type: 'GuessList', items: guesses });
    }
    nodes.push(footer);
    base.nodes = nodes;
    return base;
  }

  if (templateId === 'score-summary-v1') {
    const houseCount = Math.max(1, Math.floor(Number(pack.houseCount) || 6));
    const maxPoints = Math.max(1, Math.floor(Number(pack.maxPoints) || 6));
    const raw = Array.isArray(payload.houses) ? payload.houses : [];
    const houses = Array.from({ length: houseCount }, (_, i) => {
      const row = raw[i] && typeof raw[i] === 'object' ? raw[i] : {};
      const points = Math.max(0, Math.floor(Number(row.points) || 0));
      return {
        name: String(row.name || '').trim(),
        points: points > maxPoints ? maxPoints : points,
      };
    });
    const legend = Array.isArray(pack.legend)
      ? pack.legend
        .map((item) => {
          const points = Math.floor(Number(item?.points) || 0);
          const label = String(item?.label || '').trim();
          return points && label ? `${points} pkt — ${label}` : '';
        })
        .filter(Boolean)
        .join(' · ')
      : '';
    const titles = Array.isArray(pack.titles)
      ? pack.titles
        .map((item) => {
          const min = Math.max(0, Math.floor(Number(item?.min) || 0));
          const title = String(item?.title || '').trim();
          return title ? `${min}+ pkt — ${title}` : '';
        })
        .filter(Boolean)
        .join(' · ')
      : '';
    const kicker = String(pack.kicker || 'Łowca światełek').trim();
    const instruction = String(
      pack.printInstruction || 'Zaznacz, ile punktów ma każdy dom — jak na planszy do gry.'
    ).trim();
    const totalLabel = String(pack.totalLabel || 'Suma').trim() || 'Suma';
    base.nodes = [
      { type: 'Kicker', text: kicker },
      heading,
      { type: 'Text', text: instruction, style: 'muted' },
      legend ? { type: 'Text', text: legend, style: 'muted' } : null,
      { type: 'Divider' },
      { type: 'ScoreHuntBoard', houses, maxPoints, houseCount },
      { type: 'Text', text: `${totalLabel}: ______ pkt`, style: 'accent' },
      titles ? { type: 'Text', text: titles, style: 'muted' } : null,
      footer,
    ].filter(Boolean);
    return base;
  }

  if (templateId === 'then-now-v1') {
    const slots = Array.isArray(pack.slots) && pack.slots.length
      ? pack.slots
      : [{ id: 'then', label: 'Wtedy' }, { id: 'now', label: 'Dziś' }];
    const photos = payload.photos && typeof payload.photos === 'object' ? payload.photos : {};
    const caption = String(payload.caption || '').trim();
    const kicker = String(pack.kicker || 'Wtedy i dziś').trim();
    const items = slots.map((slot) => {
      const id = String(slot?.id || '').trim();
      const entry = photos[id];
      const src = typeof entry === 'string'
        ? entry
        : String(entry?.url || entry?.dataUrl || '').trim();
      return {
        label: String(slot?.label || id || 'Zdjęcie').trim(),
        src,
      };
    });
    base.nodes = [
      { type: 'Kicker', text: kicker },
      heading,
      { type: 'Divider' },
      { type: 'PhotoPair', items },
      caption ? { type: 'Text', text: caption, style: 'accent' } : null,
      footer,
    ].filter(Boolean);
    return base;
  }

  if (templateId === 'ranking-v1') {
    base.nodes = [
      ...intro,
      {
        type: 'RankList',
        items: (payload.items || []).map((item) => String(item || '').trim()).filter(Boolean),
      },
      footer,
    ];
    return base;
  }

  if (templateId === 'bingo-v1') {
    const size = Number(pack.columns || pack.rows || 3) || 3;
    const items = [...(data.items || [])].slice(0, size * size);
    while (items.length < size * size) items.push('');
    const checkedMap = payload.checked && typeof payload.checked === 'object' ? payload.checked : {};
    base.nodes = [
      heading,
      { type: 'Text', text: 'Zaznacz rząd albo całą planszę — jak lubisz.', style: 'muted' },
      { type: 'Divider' },
      {
        type: 'BingoGrid',
        columns: size,
        items,
        checked: items.map((item) => !!checkedMap[item]),
      },
      footer,
    ];
    return base;
  }

  if (DIY_TEMPLATES.has(templateId)) {
    const extra = payloadNodes(data).filter((node) => node.type !== 'CheckboxList' || (node.items || []).some(Boolean));
    base.nodes = [
      ...intro,
      { type: 'Text', text: 'Instrukcja DIY — wydrukuj w skali 100%. Linie cięcia i zgięcia oznaczone na arkuszu.' },
      { type: 'CutLine', label: 'CIĘCIE' },
      ...extra,
      footer,
    ];
    return base;
  }

  const body = payloadNodes(data);
  base.nodes = [
    ...intro,
    ...(body.length ? body : [{ type: 'Text', text: 'Wypełnij dodatek, a tutaj pojawi się gotowa karta do druku.', style: 'muted' }]),
    footer,
  ];
  return base;
}

async function renderSpecialPdf(descriptor, progressPayload, variant = 'COLOR', layout) {
  const { renderDocumentDefinition, friendlyFilename } = require('./PdfRenderService');
  const definition = buildDocumentDefinition(descriptor, progressPayload, variant, layout);
  if (!definition) {
    throw new Error('No document template for this special window');
  }
  const buffer = await renderDocumentDefinition(definition, progressPayload);
  const filename = friendlyFilename(definition.templateId, descriptor.headline);
  return { buffer, filename, definition };
}

module.exports = {
  resolveContentPack,
  buildDocumentDefinition,
  renderSpecialPdf,
  defaultPdfLayout,
};

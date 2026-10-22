'use strict';

const fs = require('fs');
const path = require('path');
const React = require('react');
const { loadReactPdf } = require('../reactPdf');

const {
  assertGraphicsPresent,
  getGraphicPath,
  getDayBadgePath,
  resolveScratchDesignImage,
} = require('./scratchAssets');
const {
  computeScratchLayout,
  pageSizePoints,
  normalizeExportFormat,
  MAX_DAYS,
  WINDOW_BOX_SOURCE,
  WINDOW_BOX_HEIGHT_PX,
  LAYOUT,
} = require('./scratchWindowLayout');

const ORDER_LABEL_COLOR = '#C9A13B';

const fontsDir = path.resolve(__dirname, '../../assets/fonts');

let fontsRegistered = false;

function ensureFonts(Font) {
  if (fontsRegistered) return;
  Font.register({
    family: 'Source Serif 4',
    fonts: [
      { src: path.join(fontsDir, 'SourceSerif4-Regular.ttf'), fontWeight: 400 },
      { src: path.join(fontsDir, 'SourceSerif4-Semibold.ttf'), fontWeight: 600 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

function bufferImage(buffer, format) {
  return { data: buffer, format: format === 'jpeg' ? 'jpg' : format };
}

function fileImage(filePath) {
  return { data: fs.readFileSync(filePath), format: 'png' };
}

// Badge sources are ~25x more pixels than their printed size; react-pdf decodes every
// RGBA image in JS, so oversized badges dominated export time. Downscale once per
// instance to the 600 DPI print size (the highest raster export resolution).
const MAX_EXPORT_DPI = 600;
let badgeCache = null;

async function loadDayBadges(badgeRect) {
  const size = Math.ceil((Math.max(badgeRect.width, badgeRect.height) * MAX_EXPORT_DPI) / 72);
  if (badgeCache?.size === size) return badgeCache.images;
  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const images = new Map();
  for (let day = 1; day <= MAX_DAYS; day += 1) {
    const filePath = getDayBadgePath(day);
    const img = await loadImage(filePath);
    if (img.width <= size && img.height <= size) {
      images.set(day, fileImage(filePath));
      continue;
    }
    const scale = size / Math.max(img.width, img.height);
    const canvas = createCanvas(Math.round(img.width * scale), Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    images.set(day, { data: canvas.toBuffer('image/png'), format: 'png' });
  }
  badgeCache = { size, images };
  return images;
}

let windowBoxCache = null;

async function loadWindowBox() {
  if (windowBoxCache) return windowBoxCache;
  const filePath = getGraphicPath('windowBox');
  const { width, height, stretch } = WINDOW_BOX_SOURCE;
  if (WINDOW_BOX_HEIGHT_PX === height) {
    windowBoxCache = fileImage(filePath);
    return windowBoxCache;
  }
  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const img = await loadImage(filePath);
  const extra = WINDOW_BOX_HEIGHT_PX - height;
  const bandH = stretch.bottom - stretch.top;
  const canvas = createCanvas(width, WINDOW_BOX_HEIGHT_PX);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, stretch.top, 0, 0, width, stretch.top);
  ctx.drawImage(img, 0, stretch.top, width, bandH, 0, stretch.top, width, bandH + extra);
  ctx.drawImage(
    img,
    0, stretch.bottom, width, height - stretch.bottom,
    0, stretch.bottom + extra, width, height - stretch.bottom,
  );
  windowBoxCache = { data: canvas.toBuffer('image/png'), format: 'png' };
  return windowBoxCache;
}

function normalizeTasks(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  return list
    .map((t) => {
      const day = Number(t.day);
      const hasBodyField =
        t.description != null
        || t.text != null
        || t.task != null;

      if (hasBodyField) {
        const title = String(t.title ?? '').trim();
        const text = String(t.description ?? t.text ?? t.task ?? '').trim();
        return {
          day,
          title: title || undefined,
          text,
        };
      }

      return {
        day,
        title: undefined,
        text: String(t.title ?? '').trim(),
      };
    })
    .filter((t) => Number.isFinite(t.day) && t.day > 0 && t.text)
    .sort((a, b) => a.day - b.day);
}

function taskContentByDay(tasks) {
  const map = new Map();
  for (const t of normalizeTasks(tasks)) {
    if (t.day >= 1 && t.day <= MAX_DAYS) {
      map.set(t.day, { title: t.title, text: t.text });
    }
  }
  return map;
}

function fontSizeForTextBox(width, height) {
  const minDim = Math.min(width, height);
  if (minDim < 36) return 6;
  if (minDim < 48) return 7;
  if (minDim < 64) return 8;
  if (minDim < 80) return 9;
  if (minDim < 100) return 10;
  return 11;
}

function rectStyle(rect) {
  return {
    position: 'absolute',
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Build scratch calendar PDF buffer.
 * Layers: design background → logo → headers → heart → window boxes → day badges → texts.
 *
 * @param {{ format?: string, designUrl: string, tasks: unknown[], orderNumber?: string|null }} input
 * @returns {Promise<Buffer>}
 */
async function buildScratchPdfBuffer(input) {
  const { renderToBuffer, Document, Page, Text, View, Image, Font, StyleSheet } = await loadReactPdf();
  ensureFonts(Font);
  assertGraphicsPresent();

  const format = normalizeExportFormat(input.format);
  const dims = pageSizePoints(format);
  const layout = computeScratchLayout(dims);
  const { buffer: designBuffer, format: designFormat } = await resolveScratchDesignImage(input.designUrl);
  const texts = taskContentByDay(input.tasks);
  const windowBoxSrc = await loadWindowBox();
  const orderNumber = input.orderNumber ? String(input.orderNumber).trim() : '';
  const dayBadgeSrc = await loadDayBadges(layout.windows[0].badge);

  const styles = StyleSheet.create({
    page: {
      backgroundColor: '#ffffff',
    },
    taskText: {
      fontFamily: 'Source Serif 4',
      fontWeight: 400,
      color: '#1a2e1f',
      textAlign: 'center',
    },
    taskTitle: {
      fontFamily: 'Source Serif 4',
      fontWeight: 600,
      color: '#1a2e1f',
      textAlign: 'center',
    },
    textBox: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
    },
    orderLabel: {
      fontFamily: 'Source Serif 4',
      fontWeight: 600,
      fontSize: LAYOUT.orderLabelFontSize,
      color: ORDER_LABEL_COLOR,
      textAlign: 'right',
      letterSpacing: 1,
    },
  });

  const windowNodes = [];

  for (const cell of layout.windows) {
    windowNodes.push(
      React.createElement(Image, {
        key: `box-${cell.day}`,
        src: windowBoxSrc,
        fixed: true,
        style: rectStyle(cell),
      }),
    );

    windowNodes.push(
      React.createElement(Image, {
        key: `badge-${cell.day}`,
        src: dayBadgeSrc.get(cell.day),
        fixed: true,
        style: rectStyle(cell.badge),
      }),
    );

    const content = texts.get(cell.day);
    if (!content?.text) continue;

    const fsSize = fontSizeForTextBox(cell.text.width, cell.text.height);
    const textChildren = content.title
      ? [
          React.createElement(
            Text,
            { key: 'title', style: [styles.taskTitle, { fontSize: fsSize }] },
            content.title,
          ),
          React.createElement(
            Text,
            { key: 'body', style: [styles.taskText, { fontSize: fsSize }] },
            `\n${content.text}`,
          ),
        ]
      : content.text;

    windowNodes.push(
      React.createElement(
        View,
        {
          key: `text-${cell.day}`,
          fixed: true,
          wrap: false,
          style: [styles.textBox, rectStyle(cell.text)],
        },
        React.createElement(
          Text,
          { style: [styles.taskText, { fontSize: fsSize }] },
          textChildren,
        ),
      ),
    );
  }

  const doc = React.createElement(
    Document,
    { title: 'Kalendarz zdrapka', author: 'e-Advent', creator: 'e-Advent' },
    React.createElement(
      Page,
      {
        size: format,
        orientation: 'portrait',
        style: styles.page,
      },
      React.createElement(Image, {
        key: 'design',
        src: bufferImage(designBuffer, designFormat),
        fixed: true,
        style: rectStyle(layout.design),
      }),
      React.createElement(Image, {
        key: 'logo',
        src: fileImage(getGraphicPath('logo')),
        fixed: true,
        style: rectStyle(layout.logo),
      }),
      React.createElement(Image, {
        key: 'powody',
        src: fileImage(getGraphicPath('powody')),
        fixed: true,
        style: rectStyle(layout.powody),
      }),
      React.createElement(Image, {
        key: 'odkrywaj',
        src: fileImage(getGraphicPath('odkrywaj')),
        fixed: true,
        style: rectStyle(layout.odkrywaj),
      }),
      React.createElement(Image, {
        key: 'heart',
        src: fileImage(getGraphicPath('heart')),
        fixed: true,
        style: rectStyle(layout.heart),
      }),
      ...windowNodes,
      orderNumber
        ? React.createElement(
          View,
          {
            key: 'order-number',
            fixed: true,
            wrap: false,
            style: [rectStyle(layout.orderLabel), { justifyContent: 'center' }],
          },
          React.createElement(Text, { style: styles.orderLabel }, orderNumber),
        )
        : null,
      React.createElement(View, {
        style: { width: dims.width, height: dims.height },
      }),
    ),
  );

  const pdfBuffer = await renderToBuffer(doc);
  return Buffer.from(pdfBuffer);
}

function scratchExportFilename(calendarId, format, ext) {
  const id = String(calendarId || 'kalendarz').replace(/[^\w-]+/g, '').slice(0, 36);
  const fmt = normalizeExportFormat(format);
  return `kalendarz-${id || 'scratch'}-${fmt}.${ext}`;
}

module.exports = {
  buildScratchPdfBuffer,
  scratchExportFilename,
  normalizeTasks,
};

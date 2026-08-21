'use strict';

const fs = require('fs');
const path = require('path');
const React = require('react');
const {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  Image,
  Font,
  StyleSheet,
} = require('@react-pdf/renderer');

const { getTemplatePath, resolveScratchDesignImage } = require('./scratchAssets');
const {
  buildWindowBoxes,
  scaleBoxToPage,
  pageSizePoints,
  normalizeExportFormat,
} = require('./scratchWindowLayout');

const fontsDir = path.resolve(__dirname, '../../assets/fonts');

let fontsRegistered = false;

function ensureFonts() {
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

function fileImage(filePath, format) {
  return { data: fs.readFileSync(filePath), format };
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

      // Legacy / interactive: tylko `title` = treść ciała
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
    map.set(t.day, { title: t.title, text: t.text });
  }
  return map;
}

function fontSizeForBox(height) {
  // Larger type so temporary grid texts stay readable on A4/A3
  if (height < 40) return 7;
  if (height < 56) return 8;
  if (height < 72) return 9;
  if (height < 96) return 10;
  return 11;
}

/**
 * Build scratch calendar PDF buffer.
 * Layers: design → template → window texts on top (visible until exact hole coords exist).
 *
 * @param {{ format?: string, designUrl: string, tasks: unknown[] }} input
 * @returns {Promise<Buffer>}
 */
async function buildScratchPdfBuffer(input) {
  ensureFonts();

  const format = normalizeExportFormat(input.format);
  const dims = pageSizePoints(format);
  const { buffer: designBuffer, format: designFormat } = await resolveScratchDesignImage(input.designUrl);
  const templatePath = getTemplatePath();
  if (!fs.existsSync(templatePath)) {
    const err = new Error('Brak pliku template.png dla kalendarza zdrapki');
    err.status = 500;
    err.code = 'SCRATCH_TEMPLATE_MISSING';
    throw err;
  }

  const normalized = normalizeTasks(input.tasks);
  const texts = taskContentByDay(normalized);
  const maxDay = normalized.reduce((m, t) => Math.max(m, t.day), 0);
  const taskCount = Math.max(maxDay, normalized.length, 1);
  const logicalBoxes = buildWindowBoxes(taskCount);
  const pageBoxes = logicalBoxes.map((b) => scaleBoxToPage(b, dims));

  const styles = StyleSheet.create({
    page: {
      backgroundColor: '#000000',
    },
    fullBleed: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: dims.width,
      height: dims.height,
    },
    windowBox: {
      position: 'absolute',
      padding: 3,
      justifyContent: 'center',
      alignItems: 'center',
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
  });

  // Texts on top of template until exact foil-hole coords are calibrated.
  // Box geometry unchanged — title (bold) + body share the same centered box.
  const windowNodes = pageBoxes.map((box) => {
    const fsSize = fontSizeForBox(box.height);
    const content = texts.get(box.day);
    if (!content?.text) return null;

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

    return React.createElement(
      View,
      {
        key: `day-${box.day}`,
        fixed: true,
        wrap: false,
        style: [
          styles.windowBox,
          {
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
          },
        ],
      },
      React.createElement(
        Text,
        { style: [styles.taskText, { fontSize: fsSize }] },
        textChildren,
      ),
    );
  }).filter(Boolean);

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
        style: styles.fullBleed,
      }),
      React.createElement(Image, {
        key: 'template',
        src: fileImage(templatePath, 'png'),
        fixed: true,
        style: styles.fullBleed,
      }),
      ...windowNodes,
      // In-flow spacer so MediaBox keeps correct page height when children are fixed/absolute.
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

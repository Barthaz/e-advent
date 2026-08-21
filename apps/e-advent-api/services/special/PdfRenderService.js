'use strict';

const path = require('path');
const fs = require('fs');
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

const fontsDir = path.resolve(__dirname, '../../assets/fonts');
const pdfAssetsDir = path.resolve(__dirname, '../../assets/pdf');
const brandDir = path.resolve(__dirname, '../../../../assets/brand');
const { sniffImageFormat, isPdfSafeImageFormat } = require('../imageFormat');

const COLORS = {
  gold: '#d4af37',
  goldLight: '#f4d03f',
  goldDeep: '#b08d57',
  cream: '#f7f2ea',
  creamText: '#f4e6c1',
  overlay: 'rgba(6, 22, 18, 0.52)',
  inkBg: '#f7f2ea',
  inkText: '#1a2e1f',
  inkMuted: '#5a6358',
  footer: '#071510',
};

let fontsRegistered = false;

function ensureFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: 'Cormorant Garamond',
    src: path.join(fontsDir, 'CormorantGaramond.ttf'),
  });
  Font.register({
    family: 'Cormorant Garamond',
    fontStyle: 'italic',
    src: path.join(fontsDir, 'CormorantGaramond-Italic.ttf'),
  });
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

function pagePoints(size, orientation) {
  const sizes = {
    A3: [841.89, 1190.55],
    A4: [595.28, 841.89],
    A5: [419.53, 595.28],
    A6: [297.64, 419.53],
    SQUARE: [419.53, 419.53],
  };
  let [width, height] = sizes[String(size || 'A5').toUpperCase()] || sizes.A5;
  if (String(size).toUpperCase() !== 'SQUARE' && String(orientation).toLowerCase() === 'landscape') {
    return { width: height, height: width };
  }
  return { width, height };
}

function fileImage(filePath, format) {
  return { data: fs.readFileSync(filePath), format };
}

function resolveAmbientPath(page) {
  const orientation = String(page?.orientation || 'PORTRAIT').toUpperCase();
  const size = String(page?.size || 'A5').toUpperCase();
  let file = 'ambient-portrait.jpg';
  if (size === 'SQUARE' || size === 'A6') file = 'ambient-square.jpg';
  else if (orientation === 'LANDSCAPE') file = 'ambient-landscape.jpg';
  return path.join(pdfAssetsDir, file);
}

function logoPath() {
  return path.join(brandDir, 'eadvent-logo.png');
}

function createStyles(variant, layout, size) {
  const color = variant !== 'INK_SAVER';
  const wide = layout === 'LANDSCAPE' || layout === 'SQUARE';
  const compact = ['A5', 'A6', 'SQUARE'].includes(String(size || '').toUpperCase());
  return StyleSheet.create({
    page: {
      fontFamily: 'Source Serif 4',
      fontSize: 12,
      color: color ? COLORS.creamText : COLORS.inkText,
      backgroundColor: color ? '#04120e' : COLORS.inkBg,
    },
    background: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.overlay,
    },
    frameOuter: {
      position: 'absolute',
      top: compact ? 12 : 18,
      left: compact ? 12 : 18,
      right: compact ? 12 : 18,
      bottom: compact ? 12 : 18,
      borderWidth: 1.6,
      borderColor: COLORS.gold,
    },
    frameInner: {
      position: 'absolute',
      top: compact ? 17 : 24,
      left: compact ? 17 : 24,
      right: compact ? 17 : 24,
      bottom: compact ? 17 : 24,
      borderWidth: 0.7,
      borderColor: 'rgba(244, 208, 63, 0.45)',
    },
    content: {
      flex: 1,
      marginTop: compact ? (wide ? 28 : 32) : wide ? 36 : 42,
      marginBottom: compact ? (wide ? 72 : 84) : wide ? 92 : 108,
      marginHorizontal: compact ? (wide ? 32 : 28) : wide ? 48 : 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kicker: {
      fontFamily: 'Source Serif 4',
      fontSize: 9,
      letterSpacing: 3.2,
      textTransform: 'uppercase',
      color: COLORS.goldLight,
      textAlign: 'center',
      marginBottom: 10,
    },
    title: {
      fontFamily: 'Cormorant Garamond',
      fontSize: compact ? (wide ? 22 : 26) : wide ? 28 : 32,
      color: COLORS.goldLight,
      textAlign: 'center',
      lineHeight: 1.15,
      marginBottom: 8,
    },
    title2: {
      fontFamily: 'Cormorant Garamond',
      fontSize: 18,
      color: COLORS.gold,
      textAlign: 'center',
      marginTop: 16,
      marginBottom: 8,
    },
    accent: {
      fontFamily: 'Cormorant Garamond',
      fontStyle: 'italic',
      fontSize: 13,
      color: color ? 'rgba(244, 208, 63, 0.92)' : COLORS.goldDeep,
      textAlign: 'center',
      marginBottom: 18,
    },
    body: {
      fontFamily: 'Source Serif 4',
      fontSize: 12,
      lineHeight: 1.45,
      textAlign: 'center',
      color: color ? COLORS.cream : COLORS.inkText,
      marginBottom: 7,
    },
    muted: {
      fontFamily: 'Source Serif 4',
      fontSize: 10,
      color: color ? 'rgba(247, 242, 234, 0.7)' : COLORS.inkMuted,
      textAlign: 'center',
      marginBottom: 6,
    },
    listWrap: {
      width: '100%',
      maxWidth: 420,
      marginTop: 8,
    },
    checkListWrap: {
      alignSelf: 'center',
      width: '84%',
      maxWidth: 360,
      marginTop: 10,
    },
    rankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderBottomWidth: 0.6,
      borderBottomColor: 'rgba(212, 175, 55, 0.35)',
    },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.2,
      borderColor: COLORS.gold,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rankNum: {
      fontFamily: 'Cormorant Garamond',
      fontSize: 16,
      color: COLORS.goldLight,
    },
    rankText: {
      fontFamily: 'Source Serif 4',
      fontSize: 14,
      color: color ? COLORS.cream : COLORS.inkText,
      flex: 1,
    },
    guessBlock: {
      flex: 1,
    },
    guessName: {
      fontFamily: 'Cormorant Garamond',
      fontSize: compact ? 16 : 18,
      color: COLORS.goldLight,
      lineHeight: 1.2,
    },
    guessText: {
      fontFamily: 'Source Serif 4',
      fontSize: compact ? 11 : 12,
      color: color ? COLORS.cream : COLORS.inkText,
      marginTop: 2,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: compact ? 8 : 10,
    },
    checkBox: {
      width: compact ? 16 : 18,
      height: compact ? 16 : 18,
      borderWidth: 1.4,
      borderColor: COLORS.gold,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    checkMark: {
      fontFamily: 'Source Serif 4',
      fontSize: compact ? 10 : 11,
      color: COLORS.goldLight,
    },
    checkItem: {
      flex: 1,
      fontFamily: 'Source Serif 4',
      fontSize: compact ? 11 : 12,
      lineHeight: 1.35,
      textAlign: 'left',
      color: color ? COLORS.cream : COLORS.inkText,
    },
    table: {
      width: '100%',
      marginTop: 8,
    },
    tableHead: {
      flexDirection: 'row',
      borderBottomWidth: 1.2,
      borderBottomColor: COLORS.gold,
      paddingBottom: 6,
      marginBottom: 4,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: 'rgba(212, 175, 55, 0.28)',
      paddingVertical: 5,
    },
    cell: {
      flex: 1,
      fontFamily: 'Source Serif 4',
      fontSize: 10,
      color: color ? COLORS.cream : COLORS.inkText,
      paddingRight: 6,
    },
    cellHead: {
      flex: 1,
      fontFamily: 'Cormorant Garamond',
      fontSize: 11,
      color: COLORS.goldLight,
      paddingRight: 6,
    },
    divider: {
      width: 72,
      height: 1,
      backgroundColor: COLORS.gold,
      marginVertical: 12,
      alignSelf: 'center',
    },
    footer: {
      position: 'absolute',
      left: compact ? 24 : 36,
      right: compact ? 24 : 36,
      bottom: compact ? 20 : 28,
      alignItems: 'center',
    },
    logo: {
      width: compact ? 56 : 78,
      height: compact ? 56 : 78,
    },
    cutLine: {
      fontFamily: 'Source Serif 4',
      fontSize: 9,
      letterSpacing: 2,
      color: COLORS.gold,
      textAlign: 'center',
      marginVertical: 8,
    },
    bingoBoard: {
      width: '100%',
      maxWidth: 460,
      alignSelf: 'center',
      marginTop: 10,
    },
    bingoRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    bingoCell: {
      flex: 1,
      marginHorizontal: 4,
      minHeight: compact ? (wide ? 72 : 80) : wide ? 108 : 122,
      paddingHorizontal: 8,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: COLORS.gold,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bingoCellOn: {
      backgroundColor: 'rgba(212, 175, 55, 0.22)',
    },
    bingoMark: {
      fontFamily: 'Cormorant Garamond',
      fontSize: 15,
      color: COLORS.goldLight,
      marginBottom: 4,
    },
    bingoCellText: {
      fontFamily: 'Cormorant Garamond',
      fontSize: wide ? 13 : 15,
      textAlign: 'center',
      lineHeight: 1.2,
      color: color ? COLORS.cream : COLORS.inkText,
    },
    huntBoard: {
      alignSelf: 'stretch',
      width: '100%',
      marginTop: 4,
    },
    huntRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 9,
    },
    huntBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: COLORS.gold,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    huntBadgeNum: {
      fontFamily: 'Cormorant Garamond',
      fontSize: 11,
      color: COLORS.goldLight,
    },
    huntNameBox: {
      flex: 1,
      minHeight: 22,
      borderBottomWidth: 0.8,
      borderBottomColor: 'rgba(212, 175, 55, 0.55)',
      marginRight: 8,
      justifyContent: 'flex-end',
      paddingBottom: 2,
    },
    huntName: {
      fontFamily: 'Cormorant Garamond',
      fontSize: 13,
      color: color ? COLORS.cream : COLORS.inkText,
    },
    huntMarks: {
      flexDirection: 'row',
    },
    huntMark: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.3,
      borderColor: COLORS.gold,
      marginLeft: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    huntMarkOn: {
      backgroundColor: 'rgba(212, 175, 55, 0.28)',
    },
    huntMarkNum: {
      fontFamily: 'Source Serif 4',
      fontSize: 8,
      color: COLORS.goldLight,
    },
    photoRow: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      width: '100%',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    photoCol: {
      width: '48%',
      alignItems: 'center',
    },
    photoFrame: {
      width: '100%',
      height: wide ? 252 : 188,
      borderWidth: 2.2,
      borderColor: COLORS.gold,
      padding: 7,
      borderRadius: 4,
      backgroundColor: color ? 'rgba(7, 21, 16, 0.28)' : 'rgba(255,255,255,0.35)',
    },
    photoInner: {
      flex: 1,
      borderWidth: 0.8,
      borderColor: 'rgba(244, 208, 63, 0.45)',
      backgroundColor: color ? 'rgba(0,0,0,0.22)' : 'rgba(26,46,31,0.08)',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoImg: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    photoLabel: {
      fontFamily: 'Source Serif 4',
      fontSize: 9,
      letterSpacing: 2.4,
      textTransform: 'uppercase',
      color: COLORS.goldLight,
      textAlign: 'center',
      marginTop: 8,
    },
    photoEmpty: {
      fontFamily: 'Source Serif 4',
      fontSize: 10,
      color: color ? 'rgba(247, 242, 234, 0.55)' : COLORS.inkMuted,
      textAlign: 'center',
    },
  });
}

function bufferToPdfImage(buffer) {
  const format = sniffImageFormat(buffer);
  if (!isPdfSafeImageFormat(format)) return null;
  return { data: buffer, format: format === 'jpeg' ? 'jpg' : format };
}

function localUploadImage(filename) {
  const safe = path.basename(String(filename || ''));
  if (!safe) return null;
  const filePath = path.join(__dirname, '..', '..', 'uploads', safe);
  if (!fs.existsSync(filePath)) return null;
  return bufferToPdfImage(fs.readFileSync(filePath));
}

async function loadPdfImage(src) {
  if (!src || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:image/')) {
    const match = trimmed.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
    if (!match) return null;
    try {
      return bufferToPdfImage(Buffer.from(match[1], 'base64'));
    } catch {
      return null;
    }
  }
  const uploaded = trimmed.match(/\/uploads\/([^/?#]+)/);
  if (uploaded) {
    const local = localUploadImage(uploaded[1]);
    if (local) return local;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return localUploadImage(trimmed);
  }
  try {
    const res = await fetch(trimmed);
    if (!res.ok) return null;
    return bufferToPdfImage(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

async function hydratePhotoNodes(nodes) {
  for (const node of nodes || []) {
    if (node?.type !== 'PhotoPair' || !Array.isArray(node.items)) continue;
    for (const item of node.items) {
      item.resolvedSrc = await loadPdfImage(item.src);
    }
  }
}

function renderNodes(nodes, styles) {
  return (nodes || []).map((node, index) => {
    switch (node.type) {
      case 'Kicker':
        return React.createElement(Text, { key: index, style: styles.kicker }, node.text);
      case 'Heading':
        return React.createElement(
          Text,
          { key: index, style: node.level === 2 || node.level === 3 ? styles.title2 : styles.title },
          node.text,
        );
      case 'Text':
        return React.createElement(
          Text,
          {
            key: index,
            style: node.style === 'accent' ? styles.accent : node.style === 'muted' ? styles.muted : styles.body,
          },
          node.text,
        );
      case 'RankList': {
        const items = (node.items || []).filter(Boolean);
        return React.createElement(
          View,
          { key: index, style: styles.listWrap },
          ...items.map((item, i) =>
            React.createElement(
              View,
              { key: i, style: styles.rankRow, wrap: false },
              React.createElement(View, { style: styles.rankBadge }, React.createElement(Text, { style: styles.rankNum }, String(i + 1))),
              React.createElement(Text, { style: styles.rankText }, String(item)),
            ),
          ),
        );
      }
      case 'GuessList': {
        const items = (node.items || []).filter((item) => item && (item.name || item.guess));
        return React.createElement(
          View,
          { key: index, style: styles.listWrap },
          ...items.map((item, i) =>
            React.createElement(
              View,
              { key: i, style: styles.rankRow, wrap: false },
              React.createElement(View, { style: styles.rankBadge }, React.createElement(Text, { style: styles.rankNum }, String(i + 1))),
              React.createElement(
                View,
                { style: styles.guessBlock },
                React.createElement(Text, { style: styles.guessName }, String(item.name || 'Bez podpisu')),
                React.createElement(Text, { style: styles.guessText }, String(item.guess || 'bez typu')),
              ),
            ),
          ),
        );
      }
      case 'PhotoPair': {
        const items = (node.items || []).slice(0, 2);
        while (items.length < 2) items.push({ label: 'Zdjęcie', src: '' });
        return React.createElement(
          View,
          { key: index, style: styles.photoRow, wrap: false },
          ...items.map((item, i) =>
            React.createElement(
              View,
              { key: i, style: styles.photoCol },
              React.createElement(
                View,
                { style: styles.photoFrame },
                React.createElement(
                  View,
                  { style: styles.photoInner },
                  item.resolvedSrc
                    ? React.createElement(Image, { src: item.resolvedSrc, style: styles.photoImg })
                    : React.createElement(Text, { style: styles.photoEmpty }, 'Brak zdjęcia'),
                ),
              ),
              React.createElement(Text, { style: styles.photoLabel }, String(item.label || '')),
            ),
          ),
        );
      }
      case 'BingoGrid': {
        const columns = Math.max(1, Number(node.columns) || 3);
        const items = [...(node.items || [])];
        while (items.length < columns * columns) items.push('');
        const checked = node.checked || [];
        const rows = [];
        for (let r = 0; r < columns; r++) {
          const cells = [];
          for (let c = 0; c < columns; c++) {
            const i = r * columns + c;
            const on = !!checked[i];
            cells.push(
              React.createElement(
                View,
                {
                  key: i,
                  style: on ? [styles.bingoCell, styles.bingoCellOn] : styles.bingoCell,
                  wrap: false,
                },
                on ? React.createElement(Text, { style: styles.bingoMark }, '✓') : null,
                React.createElement(Text, { style: styles.bingoCellText }, String(items[i] || '')),
              ),
            );
          }
          rows.push(React.createElement(View, { key: `row-${r}`, style: styles.bingoRow, wrap: false }, ...cells));
        }
        return React.createElement(View, { key: index, style: styles.bingoBoard }, ...rows);
      }
      case 'ScoreHuntBoard': {
        const maxPoints = Math.max(1, Number(node.maxPoints) || 6);
        const marks = Array.from({ length: maxPoints }, (_, i) => i + 1);
        const houses = [...(node.houses || [])];
        const houseCount = Math.max(1, Number(node.houseCount) || houses.length || 6);
        while (houses.length < houseCount) houses.push({ name: '', points: 0 });
        return React.createElement(
          View,
          { key: index, style: styles.huntBoard },
          ...houses.map((house, i) =>
            React.createElement(
              View,
              { key: i, style: styles.huntRow, wrap: false },
              React.createElement(
                View,
                { style: styles.huntBadge },
                React.createElement(Text, { style: styles.huntBadgeNum }, String(i + 1)),
              ),
              React.createElement(
                View,
                { style: styles.huntNameBox },
                React.createElement(Text, { style: styles.huntName }, String(house.name || ' ')),
              ),
              React.createElement(
                View,
                { style: styles.huntMarks },
                ...marks.map((n) => {
                  const on = Number(house.points) === n;
                  return React.createElement(
                    View,
                    { key: n, style: on ? [styles.huntMark, styles.huntMarkOn] : styles.huntMark },
                    React.createElement(Text, { style: styles.huntMarkNum }, String(n)),
                  );
                }),
              ),
            ),
          ),
        );
      }
      case 'CheckboxList':
        return React.createElement(
          View,
          { key: index, style: styles.checkListWrap },
          ...(node.items || []).map((item, i) =>
            React.createElement(
              View,
              { key: i, style: styles.checkRow, wrap: false },
              React.createElement(
                View,
                { style: styles.checkBox },
                node.checked?.[i] ? React.createElement(Text, { style: styles.checkMark }, '✓') : null,
              ),
              React.createElement(Text, { style: styles.checkItem }, String(item)),
            ),
          ),
        );
      case 'Table':
        return React.createElement(
          View,
          { key: index, style: styles.table },
          React.createElement(
            View,
            { style: styles.tableHead },
            ...(node.columns || []).map((col, ci) =>
              React.createElement(Text, { key: ci, style: styles.cellHead }, col),
            ),
          ),
          ...(node.rows || []).map((row, ri) =>
            React.createElement(
              View,
              { key: `r${ri}`, style: styles.tableRow, wrap: false },
              ...(Array.isArray(row) ? row : [row]).map((cell, ci) =>
                React.createElement(Text, { key: ci, style: styles.cell }, String(cell ?? '')),
              ),
            ),
          ),
        );
      case 'Divider':
        return React.createElement(View, { key: index, style: styles.divider });
      case 'CutLine':
        return React.createElement(
          Text,
          { key: index, style: styles.cutLine },
          `✂  ${node.label || 'LINIA CIĘCIA'}  ✂`,
        );
      case 'GoldFrame':
      case 'BrandFooter':
        return null;
      default:
        return null;
    }
  });
}

async function renderDocumentDefinition(definition) {
  ensureFonts();
  await hydratePhotoNodes(definition.nodes);
  const variant = definition.variant === 'INK_SAVER' ? 'INK_SAVER' : 'COLOR';
  const layout = definition.layout
    || (String(definition.page?.size).toUpperCase() === 'SQUARE'
      ? 'SQUARE'
      : String(definition.page?.orientation).toUpperCase() === 'LANDSCAPE'
        ? 'LANDSCAPE'
        : 'PORTRAIT');
  const page = definition.page || { size: 'A5', orientation: 'PORTRAIT' };
  const styles = createStyles(variant, layout, page.size);
  const orientation = String(page.orientation || 'PORTRAIT').toLowerCase() === 'landscape' ? 'landscape' : 'portrait';
  const dims = pagePoints(page.size || 'A5', orientation);
  const color = variant === 'COLOR';
  const pageSize = String(page.size).toUpperCase() === 'SQUARE' ? [dims.width, dims.height] : (page.size || 'A5');

  const chrome = [];
  if (color) {
    chrome.push(
      React.createElement(Image, {
        key: 'bg',
        src: fileImage(resolveAmbientPath(page), 'jpg'),
        fixed: true,
        style: { position: 'absolute', top: 0, left: 0, width: dims.width, height: dims.height },
      }),
      React.createElement(View, { key: 'overlay', fixed: true, style: styles.overlay }),
    );
  }
  chrome.push(
    React.createElement(View, { key: 'frame-outer', fixed: true, style: styles.frameOuter }),
    React.createElement(View, { key: 'frame-inner', fixed: true, style: styles.frameInner }),
  );

  const doc = React.createElement(
    Document,
    { title: definition.title || definition.templateId, author: 'e-Advent', creator: 'e-Advent' },
    React.createElement(
      Page,
      { size: pageSize, orientation, style: styles.page },
      ...chrome,
      React.createElement(
        View,
        { style: styles.content },
        ...renderNodes(definition.nodes, styles),
      ),
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Image, { src: fileImage(logoPath(), 'png'), style: styles.logo }),
      ),
    ),
  );

  return renderToBuffer(doc).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (/could not be decoded|unsupported image|unknown image/i.test(msg)) {
      throw new Error('Nie udało się wstawić zdjęcia do PDF. Wczytaj je ponownie jako JPG lub PNG.');
    }
    throw err;
  });
}

function polishSlug(text) {
  const map = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
    Ą: 'a', Ć: 'c', Ę: 'e', Ł: 'l', Ń: 'n', Ó: 'o', Ś: 's', Ź: 'z', Ż: 'z',
  };
  return String(text || '')
    .split('')
    .map((ch) => map[ch] || ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function friendlyFilename(templateId, headline) {
  const slug = polishSlug(headline);
  if (slug) return `e-Advent_${slug}.pdf`;
  const map = {
    'santa-adult-letter-v1': 'e-Advent_list-do-mikolaja.pdf',
    'checklist-v1': 'e-Advent_lista.pdf',
    'gift-planner-v1': 'e-Advent_planer-prezentow.pdf',
    'bingo-v1': 'e-Advent_bingo.pdf',
    'recipe-v1': 'e-Advent_przepis.pdf',
    'paper-village-v1': 'e-Advent_papierowa-wioska.pdf',
    'scorecard-v1': 'e-Advent_wyniki.pdf',
    'ranking-v1': 'e-Advent_ranking.pdf',
    'score-summary-v1': 'e-Advent_polowanie-na-iluminacje.pdf',
  };
  return map[templateId] || `e-Advent_${templateId}.pdf`;
}

module.exports = {
  renderDocumentDefinition,
  friendlyFilename,
};

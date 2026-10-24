'use strict';

const fs = require('fs');
const path = require('path');

const { PDFDocument, rgb } = require('../../vendor/pdf-lib');
const fontkit = require('../../vendor/pdf-lib/node_modules/@pdf-lib/fontkit');

const CERTIFICATE_YEAR = 2026;
const TEMPLATE_PATHS = {
  on: path.join(__dirname, '../../assets/certificates/CERTYFIKAT-ON.pdf'),
  ona: path.join(__dirname, '../../assets/certificates/CERTYFIKAT-ONA.pdf'),
};
const SCRIPT_FONT_PATH = path.join(__dirname, '../../assets/fonts/GreatVibes-Regular.ttf');
const SERIF_FONT_PATH = path.join(__dirname, '../../assets/fonts/InriaSerif-Regular.ttf');
const SERIF_BOLD_FONT_PATH = path.join(__dirname, '../../assets/fonts/InriaSerif-Bold.ttf');

const NAME_COLOR = rgb(0xad / 255, 0, 0);
const SERIAL_COLOR = rgb(0x17 / 255, 0x33 / 255, 0x08 / 255);

/** Positions in PDF points (origin: bottom-left). Page is A4 595×842. */
const LAYOUT = {
  /** Large handwritten name in the blank under „oświadcza się, że”. */
  scriptName: { y: 458, size: 44, maxWidth: 500 },
  /** Second name, bold, in the gap above „znajduje się na Liście…”. */
  serifName: { y: 286, size: 15, maxWidth: 500 },
  /** Serial, centered, just inside the gold frame. */
  serial: { y: 18, size: 11, maxWidth: 520 },
};

function fail(message, status = 400, code = 'CERTIFICATE_ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function normalizeVariant(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'on' || v === 'male' || v === 'boy' || v === 'meski' || v === 'męski') return 'on';
  if (v === 'ona' || v === 'female' || v === 'girl' || v === 'damski') return 'ona';
  return null;
}

function formatCertificateSerial(n) {
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1) {
    throw fail('Nieprawidłowy numer certyfikatu.', 500, 'BAD_SERIAL');
  }
  return `SN-${CERTIFICATE_YEAR}-${String(num).padStart(6, '0')}`;
}

function formatCertificateLabel(n) {
  return `CERTYFIKAT NR: ${formatCertificateSerial(n)}`;
}

function certificateFilename({ variant, serialNumber }) {
  return `certyfikat-${formatCertificateSerial(serialNumber)}-${variant}.pdf`;
}

function fitSize(font, text, desired, maxWidth) {
  let size = desired;
  while (size > 8 && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  return size;
}

function drawCentered(page, font, text, { y, size, color, maxWidth }) {
  const fitted = fitSize(font, text, size, maxWidth);
  const width = font.widthOfTextAtSize(text, fitted);
  page.drawText(text, {
    x: (page.getWidth() - width) / 2,
    y,
    size: fitted,
    font,
    color,
  });
}

function loadTemplateBytes(variant) {
  const templatePath = TEMPLATE_PATHS[variant];
  if (!templatePath || !fs.existsSync(templatePath)) {
    throw fail('Brak szablonu certyfikatu.', 500, 'MISSING_TEMPLATE');
  }
  return fs.readFileSync(templatePath);
}

async function buildCertificatePdf({ variant, childName, serialNumber }) {
  const normalized = normalizeVariant(variant);
  if (!normalized) {
    throw fail('Wybierz wariant męski (ON) albo damski (ONA).', 400, 'BAD_VARIANT');
  }
  const name = String(childName || '').replace(/\s+/g, ' ').trim();
  if (name.length < 2) {
    throw fail('Imię dziecka jest wymagane do wygenerowania certyfikatu.', 400, 'MISSING_NAME');
  }

  const pdfDoc = await PDFDocument.load(loadTemplateBytes(normalized));
  pdfDoc.registerFontkit(fontkit);
  const [scriptFont, serifFont, serifBoldFont] = await Promise.all([
    pdfDoc.embedFont(fs.readFileSync(SCRIPT_FONT_PATH), { subset: true }),
    pdfDoc.embedFont(fs.readFileSync(SERIF_FONT_PATH), { subset: true }),
    pdfDoc.embedFont(fs.readFileSync(SERIF_BOLD_FONT_PATH), { subset: true }),
  ]);

  const page = pdfDoc.getPages()[0];
  drawCentered(page, scriptFont, name, { ...LAYOUT.scriptName, color: NAME_COLOR });
  drawCentered(page, serifBoldFont, name, { ...LAYOUT.serifName, color: NAME_COLOR });
  drawCentered(page, serifFont, formatCertificateLabel(serialNumber), {
    ...LAYOUT.serial,
    color: SERIAL_COLOR,
  });

  return Buffer.from(await pdfDoc.save());
}

module.exports = {
  CERTIFICATE_YEAR,
  LAYOUT,
  TEMPLATE_PATHS,
  buildCertificatePdf,
  certificateFilename,
  fail,
  formatCertificateLabel,
  formatCertificateSerial,
  normalizeVariant,
};

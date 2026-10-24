const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildCertificatePdf, formatCertificateLabel, LAYOUT } = require('../../services/certificate/certificatePdf');

async function extractText(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableWorker: true,
    isEvalSupported: false,
  }).promise;
  try {
    const page = await pdf.getPage(1);
    const items = (await page.getTextContent()).items.filter((item) => item.str && item.str.trim());
    return {
      width: page.view[2],
      height: page.view[3],
      text: items.map((item) => item.str).join(' '),
      items,
    };
  } finally {
    await pdf.destroy();
  }
}

test('personalized certificate keeps A4 and overlays name plus serial on both variants', async () => {
  const childName = 'Żaneta Łącka';
  const serialNumber = 1284;
  const label = formatCertificateLabel(serialNumber);

  for (const variant of ['on', 'ona']) {
    const buffer = await buildCertificatePdf({ variant, childName, serialNumber });
    assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
    const parsed = await extractText(buffer);
    assert.ok(Math.abs(parsed.width - 595) < 2, 'A4 width');
    assert.ok(Math.abs(parsed.height - 842) < 2, 'A4 height');
    assert.match(parsed.text, /Żaneta Łącka/);
    assert.match(parsed.text, /CERTYFIKAT NR: SN-2026-001284/);
    const nameHits = parsed.items.filter((item) => item.str.includes('Żaneta')).length;
    assert.ok(nameHits >= 2, 'child name appears twice');
    const serial = parsed.items.find((item) => item.str.includes('SN-2026-001284'));
    assert.ok(serial, label);
    assert.ok(Math.abs(serial.transform[5] - LAYOUT.serial.y) < 8, 'serial sits near the bottom edge');
    const secondName = parsed.items.filter((item) => item.str.includes('Żaneta'))
      .sort((a, b) => a.transform[5] - b.transform[5])[0];
    assert.ok(secondName, 'second name overlay');
    assert.ok(Math.abs(secondName.transform[5] - LAYOUT.serifName.y) < 8, 'second name sits lower in its gap');
  }
});

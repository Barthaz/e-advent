// Real renderer + parser, no database or external service connections.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Font } = require('@react-pdf/renderer');
const { buildCraftSheets } = require('../../services/special/CraftSheets');
const { fitLabel } = require('../../services/special/CraftPdfDocument');
const { loadRegistry } = require('../../services/special/SpecialConfigRegistry');
const { renderSpecialPdf, resolveContentPack } = require('../../services/special/DocumentRegistry');

async function readPdf(id, payload = {}, variant = 'COLOR') {
  const descriptor = loadRegistry().entries[id];
  const { buffer, definition } = await renderSpecialPdf(descriptor, payload, variant);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false}).promise;
  try {
    const pages=[];
    for(let i=1;i<=pdf.numPages;i++) {
      const page=await pdf.getPage(i);
      const items=(await page.getTextContent()).items.filter(item=>item.str);
      assert.ok(items.length>0, 'Every page must contain text');
      if(definition.craftSheets) {
        assert.ok(Math.abs(page.view[2]-595.28)<1, 'A4 width');
        assert.ok(Math.abs(page.view[3]-841.89)<1, 'A4 height, never zero');
      }
      for(const item of items) {
        assert.ok(item.transform[4]>=0 && item.transform[4]+item.width<=page.view[2]+1, 'Text fits horizontally');
        assert.ok(item.transform[5]>=0 && item.transform[5]<=page.view[3], 'Text fits vertically');
      }
      pages.push(items.map(item=>item.str).join(' ').replace(/\s+/gu,' '));
    }
    return pages;
  } finally { await pdf.destroy(); }
}

test('real PDFs have physical pages and preserve all personalized fields in both variants', async()=>{
  for(const [id,count] of [['set-4-task-13',1],['set-4-task-2',3],['set-4-task-21',2],['set-4-task-20',1],['set-4-task-28',1],['set-4-task-3',2]]) {
    const pack=resolveContentPack(loadRegistry().entries[id].contentKey);
    const fields=Object.fromEntries((pack.fields||[]).map((label,i)=>[label,`Treść ${i+1}: Żaneta Łącka`]));
    for(const variant of ['COLOR','INK_SAVER']) {
      const pages=await readPdf(id,{fields},variant);
      assert.equal(pages.length,count);
      for(const value of Object.values(fields)) assert.ok(pages.join(' ').includes(value),`Lost field: ${value}`);
    }
  }
});

test('long text is wrapped using the actual font and rejected when no readable size fits', async()=>{
  // Register and load the same font via the real rendering entry point.
  await readPdf('set-4-task-13');
  const font=Font.getFont({fontFamily:'Source Serif 4'}).data;
  const value={text:'Wspólna zimowa wyprawa i długi spacer. '.repeat(3),size:11,width:128,height:21};
  const fitted=fitLabel(value,font);
  assert.equal(fitted.text.replace(/\s+/g,' ').trim(),value.text.trim());
  assert.ok(fitted.text.split('\n').length*fitted.size*1.25+2<=value.height*72/25.4);
  assert.throws(()=>fitLabel({...value,text:'W'.repeat(500)},font),error=>error.status===400);
  assert.throws(()=>buildCraftSheets('labels-sheet-v1',{fields:['Dla']},{fields:{Dla:'W'.repeat(161)}}),error=>error.status===400);
});

test('a family recipe PDF contains the saved ingredients, method and history', async()=>{
  const pages=await readPdf('set-5-task-27',{fields:{
    'Nazwa potrawy':'Pierogi babci', 'Składniki i ilości':'500 g mąki',
    'Przygotowanie krok po kroku':'Wyrób ciasto i ulep pierogi.',
    'Skąd wziął się ten przepis':'Z zeszytu babci',
  }});
  for(const text of ['Pierogi babci','500 g mąki','Wyrób ciasto i ulep pierogi.','Z zeszytu babci']) assert.ok(pages.join(' ').includes(text));
  assert.ok(!pages.join(' ').includes('Składnik 1'));
});

test('then-and-now photos fit on one landscape card without a blank continuation page', async()=>{
  const {createCanvas}=require('@napi-rs/canvas');
  const canvas=createCanvas(240,160);
  canvas.getContext('2d').fillRect(0,0,240,160);
  const dataUrl=canvas.toDataURL('image/png');
  for(const variant of ['COLOR','INK_SAVER']) {
    const pages=await readPdf('set-1-task-17',{photos:{then:{dataUrl},now:{dataUrl}}},variant);
    assert.equal(pages.length,1);
    const text=pages[0].replace(/\s+/gu,'').toUpperCase();
    assert.ok(text.includes('WTEDY'));
    assert.ok(text.includes('DZIŚ'));
  }
});

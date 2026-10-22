'use strict';

const React=require('react');
const { getReactPdf }=require('../reactPdf');
const h=React.createElement;
const MM=72/25.4;
// Loaded by PdfRenderService.renderDocumentDefinition() before this module is used.
const rp=()=>getReactPdf();
const components={ get path(){return rp().Path;}, get rect(){return rp().Rect;}, get circle(){return rp().Circle;}, get line(){return rp().Line;} };

function palette(variant,theme) {
  if(variant==='INK_SAVER') return { accent:'#222222',tint:'#ffffff',paper:'#ffffff',ink:'#111111' };
  if(theme.includes('Czerwona')) return { accent:'#a43936',tint:'#f9eee8',paper:'#ffffff',ink:'#29231f' };
  if(theme.includes('granat')) return { accent:'#233e62',tint:'#eff4f8',paper:'#ffffff',ink:'#1c2d42' };
  if(theme.includes('Kraft')) return { accent:'#7b5735',tint:'#f3eadb',paper:'#ffffff',ink:'#32281f' };
  return { accent:'#245943',tint:'#f2eee3',paper:'#ffffff',ink:'#1d3027' };
}
function fitLabel(value,font) {
  const width=value.width*MM-2;
  for(let size=value.size;size>=Math.min(7,value.size);size-=.5) {
    const measure=str=>font.layout(str).advanceWidth/font.unitsPerEm*size;
    const lines=[];
    for(const paragraph of value.text.split(/\r?\n/u)) {
      let current='';
      for(const word of paragraph.trim().split(/\s+/u)) {
        if(measure(current?`${current} ${word}`:word)<=width) {
          current=current?`${current} ${word}`:word;
        } else {
          if(current) lines.push(current);
          current='';
          for(const letter of word) {
            if(current && measure(current+letter)>width) { lines.push(current);current=''; }
            current+=letter;
          }
        }
      }
      lines.push(current);
    }
    if(lines.length*size*1.25+2<=value.height*MM) return {...value,size,text:lines.join('\n')};
  }
  const error=new Error('Tekst nie mieści się na karcie. Skróć treść pól przed wydrukiem.');
  error.status=400;throw error;
}
function label(value,key,colors,font) {
  const { Text }=rp();
  value=fitLabel(value,font);
  return h(Text,{key,hyphenationCallback:word=>[word],style:{
    position:'absolute',left:value.x*MM,top:value.y*MM,width:value.width*MM,height:value.height*MM,
    fontFamily:'Source Serif 4',fontSize:value.size,lineHeight:1.18,color:colors.ink,textAlign:value.align||'left',
  }},value.text);
}
async function craftPdfDocument(definition) {
  const { Document,Page,Svg,Line,Font }=rp();
  await Font.load({fontFamily:'Source Serif 4'});
  const font=Font.getFont({fontFamily:'Source Serif 4'}).data;
  const print=(value,key)=>label(value,key,colors,font);
  const colors=palette(definition.variant,definition.craftTheme||'');
  return h(Document,{title:definition.title,author:'e-Advent',creator:'e-Advent'},
    // Absolute children do not contribute to Yoga's page height when wrapping is disabled.
    ...definition.craftSheets.map((s,page)=>h(Page,{key:page,size:'A4',orientation:'portrait',wrap:false,style:{backgroundColor:'#ffffff',minHeight:297*MM,height:297*MM,width:210*MM}},
      h(Svg,{viewBox:'0 0 210 297',width:210*MM,height:297*MM,style:{position:'absolute',left:0,top:0}},
        h(Line,{x1:14,y1:38,x2:196,y2:38,stroke:colors.accent,strokeWidth:.5}),
        ...s.shapes.map((item,i)=>h(components[item.kind],{key:i,
          fill:'none',stroke:item.role==='writing'?'#999999':item.role==='cut'?'#222222':colors.accent,
          strokeWidth:item.role==='cut'?.3:.22,
          ...(item.role==='fold'?{strokeDasharray:'2 1.5'}:{}),
          ...item.attrs,...(item.attrs.fill?{fill:colors[item.attrs.fill]||item.attrs.fill}:{}),
        })),
      ),
      print({x:14,y:9,width:182,height:5,text:'e-Advent / Pracownia świąteczna',size:8},'brand'),
      print({x:14,y:16,width:182,height:10,text:s.title,size:18},'title'),
      print({x:14,y:28,width:182,height:9,text:s.subtitle,size:9},'subtitle'),
      ...s.texts.map((value,i)=>print(value,i)),
      print({x:14,y:286,width:182,height:6,text:`Drukuj: A4, rozmiar rzeczywisty / 100%. Bez dopasowania.  •  ${page+1}/${definition.craftSheets.length}`,size:8},'footer'),
    )),
  );
}
module.exports={craftPdfDocument,fitLabel};

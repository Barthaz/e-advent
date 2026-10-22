'use strict';

// All coordinates are millimetres on A4. Geometry is data, not a raster template.
const CRAFT_TEMPLATES = new Set(require('../../../../packages/content/craft-templates.json'));
const sheet = (title, subtitle) => ({ title, subtitle, shapes: [], texts: [] });
function shape(s, kind, attrs, role = 'decoration') { s.shapes.push({ kind, attrs, role }); }
function line(s, x1, y1, x2, y2, role = 'cut') { shape(s, 'line', { x1, y1, x2, y2 }, role); }
function rect(s, x, y, width, height, role = 'cut', fill) { shape(s, 'rect', { x, y, width, height, ...(fill ? { fill } : {}) }, role); }
function circle(s, cx, cy, r, role = 'hole') { shape(s, 'circle', { cx, cy, r }, role); }
function path(s, d, role = 'cut', fill) { shape(s, 'path', { d, ...(fill ? { fill } : {}) }, role); }
function text(s, x, y, width, value, size = 9, height = 12, align = 'left') {
  s.texts.push({ x, y, width, height, text: String(value), size, align });
}
function polygon(s, pts, role = 'cut', fill) {
  path(s, pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ') + ' Z', role, fill);
}
function star(s, x, y, r, role = 'cut', fill) {
  polygon(s, Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? r * 0.45 : r;
    return [x + Math.cos(a) * radius, y + Math.sin(a) * radius];
  }), role, fill);
}
function tree(s, x, y, w, h, role = 'cut', fill) {
  polygon(s, [[x+w/2,y],[x+w*.78,y+h*.32],[x+w*.65,y+h*.32],
    [x+w*.9,y+h*.61],[x+w*.72,y+h*.61],[x+w,y+h*.85],
    [x+w*.59,y+h*.85],[x+w*.59,y+h],[x+w*.41,y+h],
    [x+w*.41,y+h*.85],[x,y+h*.85],[x+w*.28,y+h*.61],
    [x+w*.1,y+h*.61],[x+w*.35,y+h*.32],[x+w*.22,y+h*.32]], role, fill);
}
function heart(s, x, y, r, role = 'cut', fill) {
  path(s, `M${x},${y+r} C${x-r*2},${y-r*.3} ${x-r},${y-r*1.5} ${x},${y-r*.45} C${x+r},${y-r*1.5} ${x+r*2},${y-r*.3} ${x},${y+r} Z`, role, fill);
}
function snow(s, x, y, r) {
  for (let i=0; i<6; i++) {
    const a=i*Math.PI/3, dx=Math.cos(a), dy=Math.sin(a);
    line(s,x,y,x+dx*r,y+dy*r,'decoration');
    for(const turn of [-.6,.6]) {
      line(s,x+dx*r*.65,y+dy*r*.65,x+dx*r*.65-Math.cos(a+turn)*r*.3,y+dy*r*.65-Math.sin(a+turn)*r*.3,'decoration');
    }
  }
}
function instructions(s, lines, y=224) {
  lines.forEach((value,i)=>text(s,14,y+i*9,182,`${i+1}. ${value}`,9,9));
}
function ruler(s) {
  line(s,14,277,64,277,'measure');
  line(s,14,275,14,279,'measure'); line(s,64,275,64,279,'measure');
  text(s,68,274,128,'Odcinek kontrolny: 5 cm przy wydruku 100%.',8,8);
}

function village() {
  return [0,1,2].map(n=>{
    const s=sheet(`Papierowa wioska / domek ${n+1}`, 'Wytnij obrys. Linie przerywane zegnij. Pola SKLEJ posmaruj klejem.');
    const x=25,y=92,w=32,h=40,g=18;
    polygon(s,[[x,y],[x+w/2,y-g],[x+w,y],[x+2*w,y],[x+2.5*w,y-g],
      [x+3*w,y],[x+4*w,y],[x+4*w+7,y+4],[x+4*w+7,y+h-4],
      [x+4*w,y+h],[x,y+h]],'cut','tint');
    for(let i=1;i<=4;i++) line(s,x+i*w,y,x+i*w,y+h,'fold');
    for(const i of [0,2]) line(s,x+i*w,y,x+(i+1)*w,y,'decoration');
    text(s,153,106,7,'KLEJ',5,8,'center');
    for(let i=0;i<4;i++) {
      for(let j=0;j<2;j++) {
        rect(s,x+i*w+6+j*13,y+10,7,9,'decoration','paper');
        line(s,x+i*w+9.5+j*13,y+10,x+i*w+9.5+j*13,y+19,'decoration');
        line(s,x+i*w+6+j*13,y+14.5,x+i*w+13+j*13,y+14.5,'decoration');
      }
      if(i%2===0) rect(s,x+i*w+12,y+27,8,13,'decoration','paper');
    }
    text(s,25,61,135,'Ścianki: po złożeniu domek ma 32 × 32 mm.',9,10);
    // Roof slope sqrt(16²+18²), plus overhang. Ridge length follows house depth.
    const slope=Math.hypot(16,18)+3;
    rect(s,25,153,36,slope*2,'cut','accent'); line(s,25,153+slope,61,153+slope,'fold');
    text(s,70,154,113,'Dach: złóż w połowie. Zostaw po 2 mm występu z przodu i z tyłu.',9,15);
    for(let i=0;i<4;i++) {
      const tx=76+i*26; rect(s,tx,183,20,8,'cut','tint');
      line(s,tx,187,tx+20,187,'fold');
    }
    text(s,70,195,120,'4 łączniki dachu: złóż wzdłuż linii, na kształt litery L.',8,12);
    instructions(s,[
      'Zamknij cztery ścianki, doklejając boczny pasek od wewnątrz.',
      'Połówki łączników przyklej od środka do skośnych krawędzi szczytów.',
      'Na pozostałe połówki łączników nałóż złożony dach i dociśnij.',
      'Dół pozostaje otwarty. Do podświetlenia użyj małej lampki LED.',
    ]);
    if(n===1) star(s,41,84,3,'decoration');
    if(n===2) circle(s,105,84,3,'decoration');
    ruler(s);return s;
  });
}

function reindeer() {
  const s=sheet('Papierowy renifer', 'Płaska figurka z dwiema składanymi podpórkami. Grubszy papier 160–200 g.');
  path(s,'M39,126 L48,130 C58,119 78,118 98,125 L121,111 L126,91 L119,76 L111,73 L110,68 L120,69 L116,57 L121,55 L126,70 L131,62 L136,64 L130,78 L135,88 L142,89 L149,72 L147,60 L152,58 L154,69 L161,63 L165,67 L155,78 L149,92 L157,96 L177,104 L180,113 L162,120 L152,118 L146,142 L136,158 L136,198 L126,198 L121,163 L91,165 L85,198 L75,198 L75,160 L59,158 L53,198 L43,198 L48,147 L36,136 Z','cut','tint');
  circle(s,153,103,1.1,'decoration'); circle(s,175,109,2,'decoration');
  text(s,14,211,182,'Podpórki: wytnij, zegnij w trzech miejscach i sklej w trójkątny tunel.',9,10);
  for(let i=0;i<2;i++) {
    const x=22+i*88,y=228;
    rect(s,x,y,70,20,'cut');
    for(const d of [20,40,60]) line(s,x+d,y,x+d,y+20,'fold');
    text(s,x+60,y+6,10,'KLEJ',6,6,'center');
  }
  text(s,14,253,182,'Doklej jedną ściankę każdego tunelu z tyłu nóg. Postaw na pozostałej ściance; figurka będzie lekko odchylona.',9,15);
  ruler(s);return [s];
}

function motifs(kind) {
  const stamp=kind==='stamp-guide-v1';
  const s=sheet(stamp?'Świąteczne stemple / wzory':'Zawieszki z masy solnej / obrysy',stamp?'Przenieś kontur na stempel. Wycinanie ziemniaka lub gumki zostaw dorosłemu.':'Wytnij papierowe szablony. Obrysuj na masie; kółka oznaczają otwory na sznurek.');
  for(let i=0;i<6;i++) {
    const x=60+(i%2)*90,y=82+Math.floor(i/2)*62;
    const scale=stamp?15:23;
    if(i%3===0) star(s,x,y,scale,'cut','tint');
    else if(i%3===1) tree(s,x-scale*.8,y-scale,scale*1.6,scale*2,'cut','tint');
    else heart(s,x,y,scale*.75,'cut','tint');
    if(!stamp) circle(s,x,y-(i%3===2?scale*.18:scale*.65),1.4);
  }
  instructions(s,stamp?[
    'Zaznacz kształt na płaskiej powierzchni stempla.',
    'Usuń materiał wokół konturu, tak aby motyw pozostał wypukły.',
    'Nałóż cienką warstwę farby; najpierw odbij próbę na kartce.',
  ]:[
    'Masa: 2 części mąki, 1 część soli, około 1 część wody.',
    'Rozwałkuj na 5–7 mm; wytnij kształt i zrób otwór przed suszeniem.',
    'Wysusz dokładnie na powietrzu. Pomaluj i przewlecz sznurek.',
  ],240);
  ruler(s);return [s];
}

function envelope() {
  const s=sheet('Koperta na mały list', 'Po złożeniu około 120 × 80 mm. Linie ciągłe: cięcie; przerywane: zgięcie.');
  polygon(s,[[45,100],[65,55],[145,55],[165,100],[193,112],[193,168],[165,180],
    [155,245],[55,245],[45,180],[17,168],[17,112]],'cut');
  rect(s,45,100,120,80,'fold');
  for(let i=0;i<3;i++) line(s,72,136+i*10,142,136+i*10,'writing');
  text(s,72,121,78,'Dla:',10,8);star(s,151,113,5,'decoration');
  text(s,62,65,85,'Wesołych Świąt',14,12,'center');
  text(s,18,135,26,'KLEJ',7,8,'center');text(s,166,135,25,'KLEJ',7,8,'center');
  text(s,14,253,182,'Zagnij boczne skrzydełka do środka, potem przyklej do nich dolną klapę. Włóż list i zamknij górną klapę.',9,17);
  ruler(s);return [s];
}

function bookmarks() {
  const s=sheet('Sześć świątecznych zakładek', 'Wytnij obrysy. Kółko to miejsce na otwór. Dwie zakładki czekają na Twoje hasło.');
  const sayings=['Jeszcze jeden rozdział','Zima między stronami','Chwila dla siebie','Ciepłe słowa','',''];
  for(let i=0;i<6;i++) {
    const x=16+(i%3)*62,y=52+Math.floor(i/3)*108;
    rect(s,x,y,54,98,'cut',i%2?'paper':'tint'); circle(s,x+27,y+8,1.6);
    if(i%2) tree(s,x+17,y+20,20,26,'decoration');else star(s,x+27,y+32,11,'decoration');
    text(s,x+6,y+57,42,sayings[i]||'Twoje hasło:',12,24,'center');
    if(!sayings[i]) for(let j=0;j<2;j++) line(s,x+7,y+76+j*9,x+47,y+76+j*9,'writing');
  }
  ruler(s);return [s];
}

function memoryChain() {
  return [0,1].map(style=>{
    const s=sheet(`Łańcuch wspomnień / styl ${style+1}`, '12 pasków na arkuszu. Napisz wspomnienie, przewlecz pasek i sklej końce w ogniwo.');
    for(let i=0;i<12;i++) {
      const y=49+i*18;
      rect(s,15,y,180,15,'cut',style?'paper':'tint');
      line(s,27,y,27,y+15,'decoration');text(s,16,y+5,10,'KLEJ',5,5,'center');
      if(style) tree(s,182,y+2,8,10,'decoration');else star(s,186,y+7.5,4,'decoration');
      text(s,32,y+2,142,'Wspominam…',7,5);line(s,32,y+12,177,y+12,'writing');
    }
    ruler(s);return s;
  });
}

function garland() {
  const s=sheet('Mała świąteczna girlanda', 'Wytnij 6 elementów. Kółka oznaczają otwory na sznurek. Dopisz litery lub imiona.');
  for(let i=0;i<6;i++) {
    const x=24+i%2*90,y=52+Math.floor(i/2)*70;
    if(i<2) polygon(s,[[x,y],[x+72,y],[x+72,y+41],[x+36,y+60],[x,y+41]],'cut','tint');
    else if(i<4) star(s,x+36,y+31,31,'cut','tint');
    else tree(s,x+6,y,60,60,'cut','tint');
    const hx=i<2?8:i<4?21:26,hy=i<2?6:i<4?20:22;
    circle(s,x+hx,y+hy,1.5);circle(s,x+72-hx,y+hy,1.5);
    line(s,x+25,y+39,x+47,y+39,'writing');
  }
  ruler(s);return [s];
}

function wrapping() {
  return ['Gwiazdki','Leśne choinki','Śnieżynki'].map((name,k)=>{
    const s=sheet(`Papier prezentowy / ${name}`, 'Wytnij prostokąt i łącz kolejne arkusze taśmą od spodu.');
    rect(s,14,43,182,224,'cut',k===1?'tint':'paper');
    for(let row=0;row<9;row++) for(let col=0;col<7;col++) {
      const x=27+col*25,y=56+row*24;
      if(k===0) star(s,x,y,6,'decoration',row%2?'accent':'paper');
      else if(k===1) tree(s,x-5,y-7,10,14,'decoration','accent');
      else snow(s,x,y,6);
    }
    ruler(s);return s;
  });
}

function origami() {
  const s=sheet('Choinka origami / sześć kroków', 'Prosty płaski model z jednego kwadratu. Zginaj dokładnie, wygładzając każdą krawędź.');
  const captions=[
    '1. Ułóż kwadrat jak romb. Ozdobna strona leży pod spodem.',
    '2. Złóż prawy róg na lewy. Rozłóż: środkowa linia będzie prowadnicą.',
    '3. Złóż dolną lewą krawędź do pionowej linii środka.',
    '4. Tak samo złóż dolną prawą krawędź. Powstanie wąski latawiec.',
    '5. Mały górny trójkąt zegnij do tyłu po poziomej linii.',
    '6. Obróć model o pół obrotu. Dorysuj bombki; choinka jest gotowa.',
  ];
  for(let i=0;i<6;i++) {
    const ox=24+i%2*94,oy=50+Math.floor(i/2)*70,scale=.36;
    const P=pts=>pts.map(([x,y])=>[ox+x*scale,oy+y*scale]);
    const pts=i<2?[[60,0],[120,60],[60,120],[0,60]]:i===2?[[60,0],[120,60],[60,120],[24.85,35.15]]:i===3?[[60,0],[95.15,35.15],[60,120],[24.85,35.15]]:i===4?[[24.85,35.15],[95.15,35.15],[60,120]]:[[60,0],[95.15,84.85],[24.85,84.85]];
    polygon(s,P(pts),'decoration',i===5?'accent':'tint');
    if(i===1||i===2) {const [a,b]=P([[60,0],[60,120]]);line(s,...a,...b,'fold');}
    if(i===2) {
      polygon(s,P([[24.85,35.15],[60,35.15],[60,120]]),'decoration','paper');
      const [a,b]=P([[24.85,35.15],[60,120]]);line(s,...a,...b,'fold');
    }
    if(i===3) {const [a,b]=P([[60,35.15],[60,120]]);line(s,...a,...b,'decoration');}
    if(i===4) {const [a,b]=P([[24.85,35.15],[95.15,35.15]]);line(s,...a,...b,'fold');}
    if(i===5) for(const p of [[60,28],[49,58],[68,65]]) {const [x,y]=P([p])[0];circle(s,x,y,1.3,'decoration');}
    text(s,ox-6,oy+46,80,captions[i],9,22);
  }
  ruler(s);
  const paper=sheet('Choinka origami / kwadrat startowy', 'Wytnij kwadrat 120 × 120 mm. Diagramy z poprzedniej strony są pomniejszone.');
  rect(paper,45,70,120,120,'cut','tint');
  text(paper,30,209,150,'Po wycięciu połóż kolorową stronę pod spodem. Możesz też użyć własnego kwadratowego papieru.',11,30,'center');
  ruler(paper);return [s,paper];
}

function printableFields(pack,payload,limit) {
  const source=payload.fields && typeof payload.fields==='object' && !Array.isArray(payload.fields)?payload.fields:{};
  const labels=Array.isArray(pack.fields)?pack.fields:Object.keys(source);
  return Object.fromEntries(labels.map(label=>{
    const value=String(source[label]??'').trim();
    if(value.length>limit) {
      const error=new Error(`Pole „${label}” jest za długie do wydruku na karcie. Skróć je do ${limit} znaków.`);
      error.status=400;throw error;
    }
    return [label,value];
  }));
}
function personalized(kind,pack,payload) {
  const fields=printableFields(pack,payload,kind==='comic-sheet-v1'?240:160);
  const theme=String(payload.theme||'');
  if(kind==='comic-sheet-v1') {
    const s=sheet('Świąteczny komiks', 'Cztery kadry na Twoją opowieść. Narysuj sceny i dopisz dialogi.');
    text(s,17,42,176,fields['Tytuł historii']||'Tytuł historii: __________________________________',14,20);
    for(let i=0;i<4;i++) {
      const x=15+i%2*94,y=67+Math.floor(i/2)*100;
      rect(s,x,y,86,91,'frame');text(s,x+4,y+3,76,`KADR ${i+1}`,7,6);
      if(!theme.includes('bez dymków')) {
        path(s,`M${x+9},${y+16} Q${x+9},${y+12} ${x+14},${y+12} L${x+70},${y+12} Q${x+77},${y+12} ${x+77},${y+18} L${x+77},${y+37} Q${x+77},${y+42} ${x+71},${y+42} L${x+27},${y+42} L${x+18},${y+49} L${x+20},${y+42} L${x+14},${y+42} Q${x+9},${y+42} ${x+9},${y+36} Z`,'decoration');
      }
      text(s,x+12,y+17,62,fields[`Kadr ${i+1}`]||'',8,23);
    }
    ruler(s);return [s];
  }
  if(kind==='coupon-sheet-v1') {
    const s=sheet('Kupony na wspólny czas','Wytnij trzy kupony. Wpisz własne pomysły w formularzu lub uzupełnij je po wydruku.');
    for(let i=0;i<3;i++) {
      const y=49+i*71;rect(s,18,y,174,63,'cut','tint');
      line(s,48,y,48,y+63,'decoration');star(s,33,y+29,9,'decoration');
      text(s,55,y+5,128,`KUPON ${i+1}`,8,7);
      text(s,55,y+14,128,`Dla: ${fields['Dla kogo']||'________________________'}`,10,15);
      text(s,55,y+30,128,fields[`Kupon ${i+1}`]||['Wspólna kawa lub kakao','Spacer wśród lampek','Wieczór filmowy'][i],11,21);
      text(s,55,y+52,128,`Od: ${fields.Podpis||'________________________'}`,9,9);
    }
    ruler(s);return [s];
  }
  return [0,1].map(page=>{
    const s=sheet(`Etykiety prezentowe / arkusz ${page+1}`, '8 etykiet na arkuszu. Wytnij obrysy i zrób otwory w oznaczonych miejscach.');
    for(let i=0;i<8;i++) {
      const x=17+i%2*93,y=47+Math.floor(i/2)*55;
      polygon(s,[[x+8,y],[x+80,y],[x+80,y+48],[x+8,y+48],[x,y+40],[x,y+8]],'cut',page?'paper':'tint');
      circle(s,x+5,y+24,1.6);
      const entries=Object.entries(fields);
      const size=entries.some(([,v])=>v.length>70)?7:9;
      entries.forEach(([label,value],j)=>text(s,x+12,y+4+j*(40/Math.max(1,entries.length)),64,`${label}: ${value||'________________'}`,size,40/Math.max(1,entries.length)-1));
    }
    ruler(s);return s;
  });
}

function buildCraftSheets(templateId,pack={},payload={}) {
  let sheets;
  switch(templateId) {
    case 'paper-village-v1': sheets=village();break;
    case 'paper-reindeer-v1': sheets=reindeer();break;
    case 'origami-guide-v1': sheets=origami();break;
    case 'salt-dough-guide-v1': case 'stamp-guide-v1': sheets=motifs(templateId);break;
    case 'envelope-decor-guide-v1': sheets=envelope();break;
    case 'bookmarks-v1': sheets=bookmarks();break;
    case 'memory-chain-v1': sheets=memoryChain();break;
    case 'garland-v1': sheets=garland();break;
    case 'wrapping-pattern-v1': sheets=wrapping();break;
    case 'labels-sheet-v1': case 'coupon-sheet-v1': case 'comic-sheet-v1': sheets=personalized(templateId,pack,payload);break;
    default: return null;
  }
  return sheets;
}
module.exports={ CRAFT_TEMPLATES, buildCraftSheets };
